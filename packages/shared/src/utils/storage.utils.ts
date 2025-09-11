export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

export class WebStorageAdapter implements StorageAdapter {
  private storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value)
    } catch (error) {
      console.error('Failed to save to storage:', error)
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from storage:', error)
    }
  }

  clear(): void {
    try {
      this.storage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }
}

export class StorageService {
  private adapter: StorageAdapter
  private prefix: string

  constructor(adapter: StorageAdapter, prefix: string = 'niney_') {
    this.adapter = adapter
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  get<T>(key: string): T | null {
    const item = this.adapter.getItem(this.getKey(key))
    if (!item) return null

    try {
      return JSON.parse(item) as T
    } catch {
      return item as T
    }
  }

  set<T>(key: string, value: T): void {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    this.adapter.setItem(this.getKey(key), serialized)
  }

  remove(key: string): void {
    this.adapter.removeItem(this.getKey(key))
  }

  clear(): void {
    this.adapter.clear()
  }

  // Specific storage operations for common use cases
  getUserData() {
    return this.get<any>('user')
  }

  setUserData(user: any): void {
    this.set('user', user)
  }

  removeUserData(): void {
    this.remove('user')
  }

  getAuthToken(): string | null {
    return this.get<string>('auth_token')
  }

  setAuthToken(token: string): void {
    this.set('auth_token', token)
  }

  removeAuthToken(): void {
    this.remove('auth_token')
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken() || !!this.getUserData()
  }
}