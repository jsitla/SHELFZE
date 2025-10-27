# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetPublicMovieLists*](#getpublicmovielists)
  - [*GetMoviesByGenre*](#getmoviesbygenre)
- [**Mutations**](#mutations)
  - [*AddNewWatch*](#addnewwatch)
  - [*UpdateReview*](#updatereview)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetPublicMovieLists
You can execute the `GetPublicMovieLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPublicMovieLists(): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPublicMovieLists(dc: DataConnect): QueryPromise<GetPublicMovieListsData, undefined>;

interface GetPublicMovieListsRef {
  ...
  (dc: DataConnect): QueryRef<GetPublicMovieListsData, undefined>;
}
export const getPublicMovieListsRef: GetPublicMovieListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPublicMovieListsRef:
```typescript
const name = getPublicMovieListsRef.operationName;
console.log(name);
```

### Variables
The `GetPublicMovieLists` query has no variables.
### Return Type
Recall that executing the `GetPublicMovieLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPublicMovieListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPublicMovieListsData {
  movieLists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
  } & MovieList_Key)[];
}
```
### Using `GetPublicMovieLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieLists } from '@dataconnect/generated';


// Call the `getPublicMovieLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPublicMovieLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPublicMovieLists(dataConnect);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
getPublicMovieLists().then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

### Using `GetPublicMovieLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPublicMovieListsRef } from '@dataconnect/generated';


// Call the `getPublicMovieListsRef()` function to get a reference to the query.
const ref = getPublicMovieListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPublicMovieListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movieLists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movieLists);
});
```

## GetMoviesByGenre
You can execute the `GetMoviesByGenre` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMoviesByGenre(vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;

interface GetMoviesByGenreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
}
export const getMoviesByGenreRef: GetMoviesByGenreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMoviesByGenre(dc: DataConnect, vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;

interface GetMoviesByGenreRef {
  ...
  (dc: DataConnect, vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
}
export const getMoviesByGenreRef: GetMoviesByGenreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMoviesByGenreRef:
```typescript
const name = getMoviesByGenreRef.operationName;
console.log(name);
```

### Variables
The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMoviesByGenreVariables {
  genre: string;
}
```
### Return Type
Recall that executing the `GetMoviesByGenre` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMoviesByGenreData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMoviesByGenreData {
  movies: ({
    id: UUIDString;
    title: string;
    year: number;
    summary?: string | null;
  } & Movie_Key)[];
}
```
### Using `GetMoviesByGenre`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMoviesByGenre, GetMoviesByGenreVariables } from '@dataconnect/generated';

// The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`:
const getMoviesByGenreVars: GetMoviesByGenreVariables = {
  genre: ..., 
};

// Call the `getMoviesByGenre()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMoviesByGenre(getMoviesByGenreVars);
// Variables can be defined inline as well.
const { data } = await getMoviesByGenre({ genre: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMoviesByGenre(dataConnect, getMoviesByGenreVars);

console.log(data.movies);

// Or, you can use the `Promise` API.
getMoviesByGenre(getMoviesByGenreVars).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

### Using `GetMoviesByGenre`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMoviesByGenreRef, GetMoviesByGenreVariables } from '@dataconnect/generated';

// The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`:
const getMoviesByGenreVars: GetMoviesByGenreVariables = {
  genre: ..., 
};

// Call the `getMoviesByGenreRef()` function to get a reference to the query.
const ref = getMoviesByGenreRef(getMoviesByGenreVars);
// Variables can be defined inline as well.
const ref = getMoviesByGenreRef({ genre: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMoviesByGenreRef(dataConnect, getMoviesByGenreVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AddNewWatch
You can execute the `AddNewWatch` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addNewWatch(vars: AddNewWatchVariables): MutationPromise<AddNewWatchData, AddNewWatchVariables>;

interface AddNewWatchRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewWatchVariables): MutationRef<AddNewWatchData, AddNewWatchVariables>;
}
export const addNewWatchRef: AddNewWatchRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addNewWatch(dc: DataConnect, vars: AddNewWatchVariables): MutationPromise<AddNewWatchData, AddNewWatchVariables>;

interface AddNewWatchRef {
  ...
  (dc: DataConnect, vars: AddNewWatchVariables): MutationRef<AddNewWatchData, AddNewWatchVariables>;
}
export const addNewWatchRef: AddNewWatchRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addNewWatchRef:
```typescript
const name = addNewWatchRef.operationName;
console.log(name);
```

### Variables
The `AddNewWatch` mutation requires an argument of type `AddNewWatchVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddNewWatchVariables {
  movieId: UUIDString;
  userId: UUIDString;
  watchDate: DateString;
}
```
### Return Type
Recall that executing the `AddNewWatch` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddNewWatchData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddNewWatchData {
  watch_insert: Watch_Key;
}
```
### Using `AddNewWatch`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addNewWatch, AddNewWatchVariables } from '@dataconnect/generated';

// The `AddNewWatch` mutation requires an argument of type `AddNewWatchVariables`:
const addNewWatchVars: AddNewWatchVariables = {
  movieId: ..., 
  userId: ..., 
  watchDate: ..., 
};

// Call the `addNewWatch()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addNewWatch(addNewWatchVars);
// Variables can be defined inline as well.
const { data } = await addNewWatch({ movieId: ..., userId: ..., watchDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addNewWatch(dataConnect, addNewWatchVars);

console.log(data.watch_insert);

// Or, you can use the `Promise` API.
addNewWatch(addNewWatchVars).then((response) => {
  const data = response.data;
  console.log(data.watch_insert);
});
```

### Using `AddNewWatch`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addNewWatchRef, AddNewWatchVariables } from '@dataconnect/generated';

// The `AddNewWatch` mutation requires an argument of type `AddNewWatchVariables`:
const addNewWatchVars: AddNewWatchVariables = {
  movieId: ..., 
  userId: ..., 
  watchDate: ..., 
};

// Call the `addNewWatchRef()` function to get a reference to the mutation.
const ref = addNewWatchRef(addNewWatchVars);
// Variables can be defined inline as well.
const ref = addNewWatchRef({ movieId: ..., userId: ..., watchDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addNewWatchRef(dataConnect, addNewWatchVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.watch_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.watch_insert);
});
```

## UpdateReview
You can execute the `UpdateReview` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateReview(vars: UpdateReviewVariables): MutationPromise<UpdateReviewData, UpdateReviewVariables>;

interface UpdateReviewRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateReviewVariables): MutationRef<UpdateReviewData, UpdateReviewVariables>;
}
export const updateReviewRef: UpdateReviewRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateReview(dc: DataConnect, vars: UpdateReviewVariables): MutationPromise<UpdateReviewData, UpdateReviewVariables>;

interface UpdateReviewRef {
  ...
  (dc: DataConnect, vars: UpdateReviewVariables): MutationRef<UpdateReviewData, UpdateReviewVariables>;
}
export const updateReviewRef: UpdateReviewRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateReviewRef:
```typescript
const name = updateReviewRef.operationName;
console.log(name);
```

### Variables
The `UpdateReview` mutation requires an argument of type `UpdateReviewVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateReviewVariables {
  id: UUIDString;
  review?: string | null;
}
```
### Return Type
Recall that executing the `UpdateReview` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateReviewData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateReviewData {
  review_update?: Review_Key | null;
}
```
### Using `UpdateReview`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateReview, UpdateReviewVariables } from '@dataconnect/generated';

// The `UpdateReview` mutation requires an argument of type `UpdateReviewVariables`:
const updateReviewVars: UpdateReviewVariables = {
  id: ..., 
  review: ..., // optional
};

// Call the `updateReview()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateReview(updateReviewVars);
// Variables can be defined inline as well.
const { data } = await updateReview({ id: ..., review: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateReview(dataConnect, updateReviewVars);

console.log(data.review_update);

// Or, you can use the `Promise` API.
updateReview(updateReviewVars).then((response) => {
  const data = response.data;
  console.log(data.review_update);
});
```

### Using `UpdateReview`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateReviewRef, UpdateReviewVariables } from '@dataconnect/generated';

// The `UpdateReview` mutation requires an argument of type `UpdateReviewVariables`:
const updateReviewVars: UpdateReviewVariables = {
  id: ..., 
  review: ..., // optional
};

// Call the `updateReviewRef()` function to get a reference to the mutation.
const ref = updateReviewRef(updateReviewVars);
// Variables can be defined inline as well.
const ref = updateReviewRef({ id: ..., review: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateReviewRef(dataConnect, updateReviewVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.review_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.review_update);
});
```

