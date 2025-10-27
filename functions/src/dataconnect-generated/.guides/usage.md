# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { addNewWatch, getPublicMovieLists, updateReview, getMoviesByGenre } from '@dataconnect/generated';


// Operation AddNewWatch:  For variables, look at type AddNewWatchVars in ../index.d.ts
const { data } = await AddNewWatch(dataConnect, addNewWatchVars);

// Operation GetPublicMovieLists: 
const { data } = await GetPublicMovieLists(dataConnect);

// Operation UpdateReview:  For variables, look at type UpdateReviewVars in ../index.d.ts
const { data } = await UpdateReview(dataConnect, updateReviewVars);

// Operation GetMoviesByGenre:  For variables, look at type GetMoviesByGenreVars in ../index.d.ts
const { data } = await GetMoviesByGenre(dataConnect, getMoviesByGenreVars);


```