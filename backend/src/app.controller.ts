import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getSystemStatus() {
    return {
      name: 'CampusOne API',
      status: 'healthy',
      version: '1.0.0',
      message: 'Welcome to CampusOne backend services. Access the web portal on http://localhost:3000',
    };
  }
}
