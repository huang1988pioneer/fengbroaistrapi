import { NextResponse } from "next/server";
import { createAppwrite, getCollectionId } from "../../_lib/appwriteClient";


// Strapi 拒絕 schema 沒有的欄位時，錯誤訊息只寫 Invalid key，
// 使用者看不出下一步。補一句去哪裡補欄位。
function withMissingAttributeHint(message) {
  const match = /Invalid key "?([\w.]+)"?|Unknown attribute: "([^"]+)"/.exec(message || "");
  if (!match) return message;
  return `bank 資料表還沒有「${match[1] || match[2]}」欄位，請部署 strapi-extension 的 bank schema 並重新啟動 Strapi 後再試。（${message}）`;
}

// 表單送來的是 YYYY-MM-DD，Strapi date 欄位直接吃；
// 若帶了時間就只取日期部分（不經時區換算，免得差一天）。無法解析的字串回傳 null，讓呼叫端擋下來。
function toStrapiDate(value) {
  if (!value) return "";
  const text = String(value);
  if (Number.isNaN(new Date(text).getTime())) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match ? match[1] : new Date(text).toISOString().slice(0, 10);
}

// PUT /api/bank/[id]
export async function PUT(req, context) {
  try {
    const { params } = context;
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await req.json();
    const { 
      name, 
      deposit, 
      site, 
      address,
      withdrawals,
      transfer,
      activity,
      card,
      account,
      note,
      category,
      expiry
    } = body;

    const { searchParams } = new URL(req.url);
    const { databases, databaseId } = createAppwrite(searchParams);
    const collectionId = await getCollectionId(databases, databaseId, 'bank');

    const payload = {};
    if (name !== undefined) payload.name = name;
    if (deposit !== undefined) payload.deposit = parseInt(deposit, 10);
    // site 欄位：空字串表示清除，否則保留值
    if (site !== undefined) payload.site = site || null;
    if (address !== undefined) payload.address = address;
    if (withdrawals !== undefined) payload.withdrawals = parseInt(withdrawals, 10);
    if (transfer !== undefined) payload.transfer = parseInt(transfer, 10);
    // activity 欄位：Appwrite 要求 URL 格式，空字串設為 null
    if (activity !== undefined) payload.activity = activity || null;
    if (card !== undefined) payload.card = card;
    if (account !== undefined) payload.account = account;
    // 同上：只有真的填了才送這幾個欄位。
    if (note) payload.note = note;
    if (category) payload.category = category;

    const formattedExpiry = toStrapiDate(expiry);
    if (formattedExpiry === null) {
      return NextResponse.json({ error: `Invalid date format: ${expiry}` }, { status: 400 });
    }
    if (formattedExpiry) payload.expiry = formattedExpiry;

    // 清空：表單把欄位送成空字串代表要清掉。舊資料表可能還沒有這些欄位，
    // 所以只對資料表裡真的存在的欄位送 null，不存在的就維持不送。
    const cleared = [
      ["note", note],
      ["category", category],
      ["expiry", expiry],
    ]
      .filter(([, value]) => value === "" || value === null)
      .map(([key]) => key);
    if (cleared.length) {
      const collection = await databases.getCollection(databaseId, collectionId);
      const existing = new Set((collection.attributes || []).map((attr) => attr.key));
      for (const key of cleared) {
        if (existing.has(key)) payload[key] = null;
      }
    }

    const response = await databases.updateDocument(
      databaseId,
      collectionId,
      id,
      payload
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error("PUT /api/bank/[id] error:", err);
    return NextResponse.json({ error: withMissingAttributeHint(err.message) }, { status: 500 });
  }
}

// DELETE /api/bank/[id]
export async function DELETE(req, context) {
  try {
    const { params } = context;
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const { databases, databaseId } = createAppwrite(searchParams);
    const collectionId = await getCollectionId(databases, databaseId, 'bank');

    await databases.deleteDocument(databaseId, collectionId, id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/bank/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
