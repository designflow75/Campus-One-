import { Controller, Post, Body, HttpCode, HttpStatus, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signUpDto: any) {
    return this.authService.signup(signUpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  async updateFcmToken(@Request() req: any, @Body('fcmToken') fcmToken: string) {
    return this.authService.updateFcmToken(req.user.userId, fcmToken);
  }
}
