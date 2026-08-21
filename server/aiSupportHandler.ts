import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const CONVERSATIONS_FILE = path.join(process.cwd(), "ai_conversations_data.json");

// Helper to read local conversations fallback
async function readConversationsFile(): Promise<any[]> {
  try {
    const raw = await fs.readFile(CONVERSATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

// Helper to save local conversations fallback
async function saveConversationsFile(conversations: any[]): Promise<void> {
  try {
    await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf-8");
  } catch (err) {
    console.error("[AI Chat Handler] Error saving conversations fallback file:", err);
  }
}

export interface ChatMessage {
  id?: string;
  sender: "customer" | "ai" | "moderator";
  text: string;
  image?: string;
  timestamp: number;
  products?: any[];
}

export interface Conversation {
  id: string;
  customerName: string;
  mobileNumber: string;
  status: "ai" | "moderator";
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  handoffRequested?: boolean;
}

export async function handleAiChatRequest(
  payload: {
    customerName: string;
    mobileNumber: string;
    conversationId?: string;
    messages: { role: string; content: string; image?: string }[];
    image?: string;
  },
  clientToUse: any
): Promise<{
  reply: string;
  products: any[];
  handoffRequested: boolean;
  conversationId: string;
}> {
  const { customerName, mobileNumber, image } = payload;
  const conversationId = payload.conversationId || `conv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // 1. Initialize OpenAI SDK with env variable key or fallback placeholder
  const apiKey = process.env.OPENAI_API_KEY || "";

  const openai = new OpenAI({ apiKey });

  // 2. Fetch live products from Supabase database
  let liveProducts: any[] = [];
  let liveCategories: any[] = [];
  let storeSettings: any = {};

  if (clientToUse) {
    try {
      const { data: pData } = await clientToUse
        .from("products")
        .select("*")
        .limit(200);
      if (pData) liveProducts = pData;

      const { data: cData } = await clientToUse
        .from("categories")
        .select("*")
        .limit(100);
      if (cData) liveCategories = cData;

      const { data: sData } = await clientToUse
        .from("settings")
        .select("*")
        .limit(20);
      if (sData) storeSettings = sData;
    } catch (dbErr) {
      console.warn("[AI Support Handler] Error querying Supabase live data:", dbErr);
    }
  }

  // 3. Prepare product & category summaries for OpenAI Prompt Context
  const categoryListStr = liveCategories.length > 0
    ? liveCategories.map((c: any) => `- ${c.name || c.title} (Slug: ${c.slug || ''}, Description: ${c.description || 'N/A'})`).join("\n")
    : "No categories currently found in database.";

  const productListStr = liveProducts.length > 0
    ? liveProducts.map((p: any) => {
        const pPrice = p.price || 0;
        const pDiscount = p.discount_price || p.discountPrice || pPrice;
        const pStock = p.stock !== undefined ? p.stock : 10;
        const pStatus = p.status || 'active';
        const pImage = p.image || p.image_url || p.featured_image || '';
        return `• ID: ${p.id} | Name: "${p.name}" | Category: "${p.category || 'General'}" | Regular Price: ৳${pPrice} | Offer Price: ৳${pDiscount} | Stock Status: ${pStock > 0 ? `In Stock (${pStock} units)` : 'Out of Stock'} | Status: ${pStatus} | Description: ${p.description ? p.description.slice(0, 150) : 'N/A'} | Image: ${pImage}`;
      }).join("\n")
    : "No products currently available in database.";

  // 4. Construct System Instruction with strict anti-hallucination rules
  const systemPrompt = `You are TAZU MART BD AI Support Agent (তাজু মার্ট বিডি এআই সাপোর্ট এজেন্ট).
You assist customers politely, professionally, and accurately in Bengali (বাংলা) or English according to the language used by the customer.

CUSTOMER DETAILS:
- Name: ${customerName || "Valued Customer"}
- Mobile Number: ${mobileNumber || "N/A"}

COMPANY & WEBSITE INFORMATION:
- Brand Name: TAZU MART BD (তাজু মার্ট বিডি)
- Website: https://tazumartbd.com
- Tagline: Premium Fashion & Lifestyle Shopping Platform
- Customer Support: Active Online Support

DELIVERY & ORDER POLICIES:
- Inside Dhaka City: ৳70 delivery charge (Estimated 1-2 days delivery)
- Outside Dhaka: ৳120 delivery charge (Estimated 2-4 days delivery)
- Payment Methods: Cash on Delivery (ক্যাশ অন ডেলিভারি), bKash, Nagad, Rocket, Online Payment Cards.
- Order Process: Customers can click "Buy Now" on products or add to cart and complete checkout with Name, Mobile, and Delivery Address.
- Return & Replacement Policy: 7 days replacement guarantee if the product is damaged, defective, or incorrect upon delivery. Customer must inspect product upon delivery.

LIVE AVAILABLE CATEGORIES:
${categoryListStr}

LIVE PRODUCT DATABASE CATALOGUE (${liveProducts.length} items total):
${productListStr}

STRICT ANTI-HALLUCINATION RULES:
1. You MUST ONLY provide prices, availability, stock, features, and policies that exist in the LIVE PRODUCT DATABASE CATALOGUE or COMPANY INFORMATION above.
2. If a customer asks about a product, price, offer, stock, or policy that is NOT in the database or approved knowledge, state clearly and politely:
   "দুঃখিত, এই তথ্যটি বর্তমানে আমার কাছে পাওয়া যাচ্ছে না।"
3. DO NOT invent fake prices, discounts, stock numbers, or non-existent items.
4. When a product matches what the customer is asking for (or when recommending products), describe it briefly and attach a JSON block at the VERY END of your response in this exact format:
[RECOMMENDED_PRODUCTS: [{"id":"prod_id","name":"Exact Product Name","price":1200,"discountPrice":990,"stock":5,"image":"https://...","category":"Watch","link":"/product/prod_id"}]]
(Only include actual matching products from the database list. Max 4 products per response).

5. HUMAN MODERATOR HANDOFF: If the customer asks to speak with a human, representative, manager, or if you cannot answer their query with 100% confidence, politely inform them that you are connecting them to a human support representative, and append [HANDOFF_REQUESTED] at the end of your response text.
`;

  // 5. Construct OpenAI messages payload
  const formattedMessages: any[] = [
    { role: "system", content: systemPrompt }
  ];

  // Append user messages history
  const userHistory = payload.messages || [];
  for (const m of userHistory.slice(-10)) {
    const role = m.role === "assistant" || m.role === "ai" ? "assistant" : "user";
    if (m.image) {
      formattedMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content || "Analyse this product image and search for matching products in TAZU MART BD database." },
          { type: "image_url", image_url: { url: m.image } }
        ]
      });
    } else {
      formattedMessages.push({ role, content: m.content || "" });
    }
  }

  // If a top-level image was uploaded in this turn
  if (image) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg && lastMsg.role === "user") {
      formattedMessages[formattedMessages.length - 1] = {
        role: "user",
        content: [
          { type: "text", text: typeof lastMsg.content === "string" ? lastMsg.content : "Please match this uploaded product image with products in TAZU MART BD database." },
          { type: "image_url", image_url: { url: image } }
        ]
      };
    }
  }

  let aiReplyText = "";
  let recommendedProducts: any[] = [];
  let handoffRequested = false;

  try {
    const completion = await openai.chat.completions.create({
      model: image ? "gpt-4o" : "gpt-4o-mini",
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 800,
    });

    aiReplyText = completion.choices[0]?.message?.content || "ধন্যবাদ! আপনার বার্তাটি আমরা পেয়েছি। কিভাবে সাহায্য করতে পারি?";
  } catch (apiErr: any) {
    console.error("[OpenAI API Exception]:", apiErr?.message || apiErr);

    // Fallback response if OpenAI API key is placeholder or invalid
    if (apiErr?.status === 401 || apiErr?.message?.includes("API key")) {
      aiReplyText = "হ্যালো " + (customerName || "গ্রাহক") + "! TAZU MART BD AI Support Agent-এ আপনাকে স্বাগতম। আমাদের OpenAI API Key টি বর্তমানে সিস্টেম আপডেট প্রক্রিয়ায় রয়েছে। আপনি আমাদের ওয়েবসাইটের ক্যাটালগ থেকে সব প্রোডাক্ট ব্রাউজ করতে পারেন অথবা প্রোডাক্ট সম্পর্কিত তথ্যের জন্য সরাসরি সাপোর্ট নম্বরে যোগাযোগ করতে পারেন।";
    } else {
      aiReplyText = "ধন্যবাদ " + (customerName || "গ্রাহক") + "! আমাদের সিস্টেমে সাময়িক সংযোগ সমস্যা হচ্ছে। অনুগ্রহ করে আপনার বার্তাটি পুনরায় পাঠান বা হটলাইনে কল দিন।";
    }
  }

  // Check for [HANDOFF_REQUESTED] flag in AI reply
  if (aiReplyText.includes("[HANDOFF_REQUESTED]")) {
    handoffRequested = true;
    aiReplyText = aiReplyText.replace("[HANDOFF_REQUESTED]", "").trim();
  }

  // Parse [RECOMMENDED_PRODUCTS: [...]] block if present
  const recMatch = aiReplyText.match(/\[RECOMMENDED_PRODUCTS:\s*(\[.*?\])\]/s);
  if (recMatch && recMatch[1]) {
    try {
      const parsedProds = JSON.parse(recMatch[1]);
      if (Array.isArray(parsedProds)) {
        recommendedProducts = parsedProds;
      }
    } catch (pErr) {
      console.warn("[AI Chat Handler] Error parsing recommended products JSON:", pErr);
    }
    // Clean JSON block out of clean display text
    aiReplyText = aiReplyText.replace(/\[RECOMMENDED_PRODUCTS:\s*\[.*?\]\]/s, "").trim();
  }

  // Fallback product search matching if AI didn't return JSON but user searched for something
  if (recommendedProducts.length === 0 && liveProducts.length > 0) {
    const lastUserQuery = userHistory[userHistory.length - 1]?.content?.toLowerCase() || "";
    if (lastUserQuery) {
      const matched = liveProducts.filter((p: any) => {
        const nameMatch = (p.name || "").toLowerCase().includes(lastUserQuery);
        const catMatch = (p.category || "").toLowerCase().includes(lastUserQuery);
        const descMatch = (p.description || "").toLowerCase().includes(lastUserQuery);
        return nameMatch || catMatch || descMatch;
      }).slice(0, 3);

      if (matched.length > 0) {
        recommendedProducts = matched.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          discountPrice: p.discount_price || p.discountPrice || p.price,
          stock: p.stock ?? 10,
          image: p.image || p.image_url || p.featured_image || "",
          category: p.category || "",
          link: `/product/${p.id}`
        }));
      }
    }
  }

  // 6. Save or update conversation history in Supabase / Local storage
  const now = Date.now();
  const customerMsgText = userHistory[userHistory.length - 1]?.content || "";
  
  const customerMsgObj: ChatMessage = {
    id: `msg_cust_${now}`,
    sender: "customer",
    text: customerMsgText,
    image,
    timestamp: now - 100
  };

  const aiMsgObj: ChatMessage = {
    id: `msg_ai_${now}`,
    sender: "ai",
    text: aiReplyText,
    products: recommendedProducts,
    timestamp: now
  };

  const existingConvs = await readConversationsFile();
  let targetConv = existingConvs.find((c: any) => c.id === conversationId);

  if (!targetConv) {
    targetConv = {
      id: conversationId,
      customerName: customerName || "Customer",
      mobileNumber: mobileNumber || "",
      status: handoffRequested ? "moderator" : "ai",
      messages: [customerMsgObj, aiMsgObj],
      createdAt: now,
      updatedAt: now,
      handoffRequested
    };
    existingConvs.unshift(targetConv);
  } else {
    targetConv.customerName = customerName || targetConv.customerName;
    targetConv.mobileNumber = mobileNumber || targetConv.mobileNumber;
    targetConv.messages.push(customerMsgObj, aiMsgObj);
    targetConv.updatedAt = now;
    if (handoffRequested) {
      targetConv.status = "moderator";
      targetConv.handoffRequested = true;
    }
  }

  await saveConversationsFile(existingConvs);

  // Sync with Supabase settings table or ai_conversations table if available
  if (clientToUse) {
    try {
      await clientToUse.from("settings").upsert({
        id: "ai_support_conversations",
        value: JSON.stringify(existingConvs.slice(0, 100))
      });
    } catch (sbSaveErr) {
      console.warn("[AI Support Handler] Non-blocking Supabase sync notice:", sbSaveErr);
    }
  }

  return {
    reply: aiReplyText,
    products: recommendedProducts,
    handoffRequested,
    conversationId
  };
}

export async function getAllConversations(clientToUse: any): Promise<Conversation[]> {
  let list: Conversation[] = [];

  if (clientToUse) {
    try {
      const { data } = await clientToUse
        .from("settings")
        .select("value")
        .eq("id", "ai_support_conversations")
        .maybeSingle();

      if (data?.value) {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (err) {}
  }

  if (list.length === 0) {
    list = await readConversationsFile();
  }

  return list;
}

export async function postModeratorReply(
  payload: { conversationId: string; text: string; moderatorName?: string },
  clientToUse: any
): Promise<Conversation | null> {
  const { conversationId, text, moderatorName } = payload;
  const conversations = await getAllConversations(clientToUse);
  const conv = conversations.find((c) => c.id === conversationId);

  if (!conv) return null;

  const now = Date.now();
  const replyObj: ChatMessage = {
    id: `msg_mod_${now}`,
    sender: "moderator",
    text: text || "",
    timestamp: now
  };

  conv.messages.push(replyObj);
  conv.updatedAt = now;
  conv.status = "moderator";

  await saveConversationsFile(conversations);

  if (clientToUse) {
    try {
      await clientToUse.from("settings").upsert({
        id: "ai_support_conversations",
        value: JSON.stringify(conversations.slice(0, 100))
      });
    } catch (e) {}
  }

  return conv;
}

export async function toggleHandoffStatus(
  conversationId: string,
  targetStatus: "ai" | "moderator",
  clientToUse: any
): Promise<Conversation | null> {
  const conversations = await getAllConversations(clientToUse);
  const conv = conversations.find((c) => c.id === conversationId);

  if (!conv) return null;

  conv.status = targetStatus;
  conv.updatedAt = Date.now();

  await saveConversationsFile(conversations);

  if (clientToUse) {
    try {
      await clientToUse.from("settings").upsert({
        id: "ai_support_conversations",
        value: JSON.stringify(conversations.slice(0, 100))
      });
    } catch (e) {}
  }

  return conv;
}
