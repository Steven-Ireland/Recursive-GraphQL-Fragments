import { buildSchema } from 'graphql';
import {gql} from 'graphql-tag';
import {transform} from '../recursive-document';

const query = gql`
  fragment NestingDollFields on NestingDoll {
    name
    nestingDoll {
      ...NestingDollFields
    }
  }

  query GetNestedDolls {
    nestingDoll {
      ...NestingDollFields @recursive(depth: 3)
    }
  }
`;

it('Recurses appropriately', () => {
  expect(transform({documents: [{location: '', document: query}]})).not.toBe(query)
})

it('appends depth', () => {
  
})
