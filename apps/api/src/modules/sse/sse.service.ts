import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { SseMessage } from '@pulserank/shared';

interface SseClient {
  id: string;
  response: Response;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private clients: Map<string, SseClient> = new Map();

  registerClient(clientId: string, response: Response): void {
    this.clients.set(clientId, { id: clientId, response });
    this.logger.log(`SSE client connected: ${clientId} (total: ${this.clients.size})`);
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    this.logger.log(`SSE client disconnected: ${clientId} (total: ${this.clients.size})`);
  }

  broadcast(message: SseMessage): void {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    const deadClients: string[] = [];

    for (const [id, client] of this.clients.entries()) {
      try {
        client.response.write(payload);
      } catch (err) {
        this.logger.warn(`Failed to write to SSE client ${id}, removing`);
        deadClients.push(id);
      }
    }

    for (const id of deadClients) {
      this.clients.delete(id);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
