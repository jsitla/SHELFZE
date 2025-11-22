const {queryRef, executeQuery, mutationRef, executeMutation, validateArgs} = require("firebase/data-connect");

const connectorConfig = {
  connector: "example",
  service: "pantryai",
  location: "us-east4",
};
exports.connectorConfig = connectorConfig;

const addNewWatchRef = (dcOrVars, vars) => {
  const {dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "AddNewWatch", inputVars);
};
addNewWatchRef.operationName = "AddNewWatch";
exports.addNewWatchRef = addNewWatchRef;

exports.addNewWatch = function addNewWatch(dcOrVars, vars) {
  return executeMutation(addNewWatchRef(dcOrVars, vars));
};

const getPublicMovieListsRef = (dc) => {
  const {dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, "GetPublicMovieLists");
};
getPublicMovieListsRef.operationName = "GetPublicMovieLists";
exports.getPublicMovieListsRef = getPublicMovieListsRef;

exports.getPublicMovieLists = function getPublicMovieLists(dc) {
  return executeQuery(getPublicMovieListsRef(dc));
};

const updateReviewRef = (dcOrVars, vars) => {
  const {dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, "UpdateReview", inputVars);
};
updateReviewRef.operationName = "UpdateReview";
exports.updateReviewRef = updateReviewRef;

exports.updateReview = function updateReview(dcOrVars, vars) {
  return executeMutation(updateReviewRef(dcOrVars, vars));
};

const getMoviesByGenreRef = (dcOrVars, vars) => {
  const {dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, "GetMoviesByGenre", inputVars);
};
getMoviesByGenreRef.operationName = "GetMoviesByGenre";
exports.getMoviesByGenreRef = getMoviesByGenreRef;

exports.getMoviesByGenre = function getMoviesByGenre(dcOrVars, vars) {
  return executeQuery(getMoviesByGenreRef(dcOrVars, vars));
};
