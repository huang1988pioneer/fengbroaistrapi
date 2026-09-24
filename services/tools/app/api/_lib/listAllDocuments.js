const PAGE_SIZE = 100;
/** 同時在飛的分頁請求數，避免一次打爆 Strapi。 */
const PAGE_CONCURRENCY = 4;

/** 依 $id 去重：平行分頁期間若有新增文件，offset 可能讓某頁重疊。 */
function dedupeById(documents) {
  const seen = new Set();
  const result = [];
  for (const doc of documents) {
    const id = doc?.$id;
    if (id != null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    result.push(doc);
  }
  return result;
}

/** 無法得知總數時，逐頁以 offset 讀到最後一頁（Strapi 不支援游標分頁）。 */
async function listSequentially(databases, databaseId, collectionId, sdk, extraQueries, firstPage) {
  const documents = [...firstPage];
  let offset = firstPage.length;

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      sdk.Query.limit(PAGE_SIZE),
      ...extraQueries,
      sdk.Query.offset(offset),
    ]);

    const page = response.documents || [];
    if (!page.length) break;

    documents.push(...page);
    if (page.length < PAGE_SIZE) break;
    if (typeof response.total === "number" && documents.length >= response.total) break;

    offset += page.length;
  }

  return dedupeById(documents);
}

/**
 * 讀出一張表的全部文件。
 *
 * 第一頁回來時 Strapi 會附上 pagination.total，剩下的頁數是已知的：改用 offset
 * 平行抓取，把原本 N 次來回的等待壓成約 N / PAGE_CONCURRENCY 次。
 * 小於一頁的表（多數情況）維持單一請求，行為不變。
 */
export async function listAllDocuments(databases, databaseId, collectionId, sdk, extraQueries = []) {
  const first = await databases.listDocuments(databaseId, collectionId, [
    sdk.Query.limit(PAGE_SIZE),
    ...extraQueries,
  ]);

  const firstPage = first.documents || [];
  if (firstPage.length < PAGE_SIZE) return firstPage;

  const total = typeof first.total === "number" && first.total > 0 ? first.total : null;
  if (total !== null && total <= firstPage.length) return firstPage;
  if (total === null) {
    return listSequentially(databases, databaseId, collectionId, sdk, extraQueries, firstPage);
  }

  const offsets = [];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
    offsets.push(offset);
  }

  const pages = new Array(offsets.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(PAGE_CONCURRENCY, offsets.length) },
    async () => {
      while (true) {
        const index = cursor++;
        if (index >= offsets.length) return;

        const response = await databases.listDocuments(databaseId, collectionId, [
          sdk.Query.limit(PAGE_SIZE),
          sdk.Query.offset(offsets[index]),
          ...extraQueries,
        ]);
        pages[index] = response.documents || [];
      }
    }
  );

  await Promise.all(workers);

  const documents = [...firstPage];
  for (const page of pages) {
    if (page) documents.push(...page);
  }

  return dedupeById(documents);
}
