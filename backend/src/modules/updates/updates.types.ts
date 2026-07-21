export interface SystemUpdateItem {
  id: string;
  title: string;
  version: string | null;
  description: string;
  pdfUrl: string | null;
  pdfOriginalName: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  isRead: boolean;
}

export interface UpdatesResponse {
  unreadCount: number;
  updates: SystemUpdateItem[];
}
