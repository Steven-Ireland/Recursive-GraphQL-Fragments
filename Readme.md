# Recursive GraphQL Fragments

## Usage

This library transforms any fragment spreads with `@recursive(depth: X)` into a set of expanded fragments. 

Transforming this:

```graphql
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
```

Into this:

```graphql
query GetNestedDolls {
  name
  nestingDoll {
    name
    nestingDoll {
      name
    }
  }
}
```