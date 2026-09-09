export async function listAllDocuments(databases, databaseId, collectionId, sdk, extraQueries = []) {
  const pageSize = 100;
  const documents = [];
  let offset = 0;

  while (true) {
    const queries = [sdk.Query.limit(pageSize), ...extraQueries];

    queries.push(sdk.Query.offset(offset));

    const response = await databases.listDocuments(databaseId, collectionId, queries);
    const page = response.documents || [];
    if (page.length) {
      documents.push(...page);
    }

    // Prefer total when Appwrite returns it, otherwise fall back to page size.
    if (!page.length || page.length < pageSize) {
      break;
    }
    if (typeof response.total === "number" && documents.length >= response.total) {
      break;
    }

    offset += page.length;
  }

  return documents;
}
