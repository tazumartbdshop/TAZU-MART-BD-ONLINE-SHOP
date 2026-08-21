// TAZU MART BD - Hostinger MySQL Database Bridge Client
// Replaces Supabase SDK with direct calls to Hostinger MySQL backend API

export interface DbResult<T = any> {
  data: T | null;
  error: any | null;
}

class QueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private whereClause: Record<string, any> = {};
  private payloadData: any = null;
  private limitVal?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: any) {
    if (!this.action || this.action === 'select') {
      this.action = 'select';
    }
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payloadData = payload;
    return this;
  }

  upsert(payload: any) {
    this.action = 'upsert';
    this.payloadData = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payloadData = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.whereClause[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  limit(count: number) {
    this.limitVal = count;
    return this;
  }

  maybeSingle() {
    return this.execute().then(res => ({
      data: Array.isArray(res.data) ? (res.data[0] || null) : res.data,
      error: res.error
    }));
  }

  single() {
    return this.maybeSingle();
  }

  async execute(): Promise<DbResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: this.action,
          table: this.tableName,
          payload: this.payloadData,
          where: Object.keys(this.whereClause).length > 0 ? this.whereClause : undefined,
          limit: this.limitVal
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        return { data: null, error: { message: errText } };
      }
      const json = await res.json();
      return { data: json.data, error: json.error };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Request failed" } };
    }
  }

  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const db: any = {
  from: (table: string) => new QueryBuilder(table),
  channel: (channelName: string) => ({
    on: (event: string, filter: any, callback: any) => ({
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    subscribe: () => ({ unsubscribe: () => {} })
  }),
  removeChannel: (channel: any) => {},
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (filePath: string) => ({ data: { publicUrl: `/uploads/${filePath}` } }),
      upload: async (filePath: string, file: any) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        return { data: { path: json.url }, error: null };
      }
    })
  }
};

export const getDb = (): any => db;
export const getDbCredentials = () => ({ url: '', key: '' });
export const fetchDbConfigFromServer = async (): Promise<boolean> => true;
