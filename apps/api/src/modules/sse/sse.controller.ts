import { Controller, Get, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SseService } from './sse.service';
import { randomUUID } from 'crypto';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get()
  subscribe(@Req() req: Request, @Res() res: Response): void {
    const clientId = randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial heartbeat so the client knows the connection is alive
    res.write(': heartbeat\n\n');

    this.sseService.registerClient(clientId, res);

    // Heartbeat every 25 seconds to prevent proxy timeouts
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      this.sseService.removeClient(clientId);
    });
  }
}
