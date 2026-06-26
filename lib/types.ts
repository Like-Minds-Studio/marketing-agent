export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface SavedConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}
