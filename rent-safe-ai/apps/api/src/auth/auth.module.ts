import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalOtpProvider } from './providers/local-otp.provider';
import { JwtStrategy } from './jwt.strategy';
import { Policies } from './policies';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-local-key',
      signOptions: { expiresIn: '15m' }, // Short-lived access token
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalOtpProvider, JwtStrategy, Policies],
  exports: [AuthService, Policies],
})
export class AuthModule {}
