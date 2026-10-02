import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from './db.constants';
import type { Database, Transaction } from './db.type';

@Injectable()
export class DbService {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  get client(): Database {
    return this.db;
  }

  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
}
