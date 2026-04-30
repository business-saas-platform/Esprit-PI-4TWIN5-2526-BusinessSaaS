import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HrAiService } from './hr-ai.service';

@Controller('team-ai')
export class TeamAiController {
  constructor(private readonly hrAiService: HrAiService) {}

  @Get('hr-risk')
  @UseGuards(JwtAuthGuard)
  async getHrRisk(@Request() req: any) {
    const businessId =
      req.user.businessId ||
      req.user.business?.id ||
      req.user.businessOwnerId ||
      req.user.sub ||
      req.user.id;

    if (!businessId) {
      return { success: false, error: 'Business ID not found in token' };
    }

    try {
      const result = await this.hrAiService.getTeamRisk(businessId);
      return { success: true, ...result, generatedAt: new Date().toISOString() };
    } catch (error) {
      return {
        success: false,
        error: 'ML service unavailable',
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
