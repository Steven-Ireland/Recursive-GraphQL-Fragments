import { oldVisit, PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import {astFromValue, ASTNode, concatAST, DirectiveNode, FragmentDefinitionNode, FragmentSpreadNode, GraphQLDirective, IntValueNode, Kind, print, visit} from 'graphql'

const DIRECTIVE_NAME = "recursive";

export const transform = ({documents}: {documents: Types.DocumentFile[]}) => {
  return documents.map(documentFile => {
    if (!documentFile.document) return documentFile;

      // @ts-ignore
    const fragmentMap = documentFile.document.definitions.filter(
      n => n.kind === Kind.FRAGMENT_DEFINITION
      // @ts-ignore
    ).reduce((prev: FragmentMap, curr: FragmentDefinitionNode) => {
      prev[curr.name.value] = curr;
      return prev;
    }, {}) as FragmentMap;

    let document = documentFile.document;
    while (visit(document, recursiveVisitor(fragmentMap)) != document) {
      document = visit(document, recursiveVisitor(fragmentMap));
    }

    // Strip recursive fragments from result
    document = visit(document, {
      FragmentDefinition: {
        leave(node) {
          const found = node.directives?.filter(d => d.name.value === DIRECTIVE_NAME);
          if (found && found.length > 0) {
            return null;
          }
        }
      }
    })

    const ret = {
      ...documentFile,
      document
    };

    console.log(print(document));

    return ret;
  })
}

interface FragmentMap {
  [name: string]: FragmentDefinitionNode
}

const recursiveVisitor = (fragments: FragmentMap) => ({
  FragmentSpread: {
    leave(node: FragmentSpreadNode) {
      const recursives = node.directives?.filter(d => d.name.value === DIRECTIVE_NAME);
      if (!recursives || recursives.length !=1) return;
      const [directive] = recursives;

      if (!directive.arguments || directive.arguments.length != 1) return;

      console.log(directive);
      const depth = parseInt((directive.arguments[0].value as IntValueNode).value);
      console.log("Operating at depth ", depth);

      const baseFragment = fragments[node.name.value];
      
      let returnedFragment = baseFragment;
      if (depth > 0) {
        // Add depth - 1 directive to fragments of same name in nested spread
        returnedFragment = appendDepth(baseFragment, directive, depth -1);
      } else {
        returnedFragment = removeNestedFragment(baseFragment);
      }

      
      return {
        ...returnedFragment.selectionSet,
        directives: []
      }
    }
  }
});

export const appendDepth = (fragmentNode: FragmentDefinitionNode, directive: DirectiveNode, newDepth: number) => {
  return visit(fragmentNode, {
    FragmentSpread: {
      leave(node) {
        if (node.name.value != fragmentNode.name.value) {
          return;
        }

        return {
          ...node,
          directives: [
            {
              ...directive,
              arguments: [
                {
                  name: {
                    kind: Kind.NAME,
                    value: "depth"
                  },
                  kind: Kind.ARGUMENT,
                  value: {
                    kind: Kind.INT,
                    value: `${newDepth}`
                  }
                }
              ]
            }
          ]
        }
      }
    }
  })
};

const removeNestedFragment = (fragmentNode: FragmentDefinitionNode) => {
  return visit(fragmentNode, {
    FragmentSpread: {
      leave(node) {
        if (node.name.value === fragmentNode.name.value) {
          return null;
        } else return;
      }
    },
    Field: {
      leave(node) {
        if (!node.selectionSet?.selections) return;

        const selections =  node.selectionSet?.selections.filter(
              s => !(s.kind === Kind.FRAGMENT_SPREAD && s.name.value === fragmentNode.name.value));

        if (selections.length == 0) return null;

        return {
          ...node,
          selectionSet: {
            ...node.selectionSet,
            selections
          }
        }
      }
    }
  })
}