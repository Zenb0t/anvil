type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CreateContextResponse {
  context_id: string;
  head_turn_id: string;
  head_depth: number;
}

export interface AppendTurnRequest {
  type_id: string;
  type_version: number;
  data: JsonValue | { [key: string]: JsonValue };
}

export class CxdbClient {
  readonly baseUrl: string;

  constructor(baseUrl = process.env.CXDB_BASE_URL ?? "http://localhost:9010") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async createContext(baseTurnId = "0"): Promise<CreateContextResponse> {
    return this.request<CreateContextResponse>("/v1/contexts/create", {
      method: "POST",
      body: JSON.stringify({ base_turn_id: String(baseTurnId) }),
    });
  }

  async appendTurn(contextId: string, body: AppendTurnRequest): Promise<unknown> {
    return this.request<unknown>(`/v1/contexts/${contextId}/append`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async listContexts(): Promise<unknown> {
    return this.request<unknown>("/v1/contexts", { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `CXDB request failed (${response.status} ${response.statusText}) ${path}\n${responseText}`,
      );
    }

    if (!responseText) {
      return {} as T;
    }

    return JSON.parse(responseText) as T;
  }
}
