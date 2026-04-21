import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAiService } from './team-ai.service';

@Controller('team-ai')
export class TeamAiController {
  constructor(private readonly teamAiService: TeamAiService) {}

  @Get('predictions')
  @UseGuards(JwtAuthGuard)
  async getPredictions(@Request() req: any) {
    console.log('\n\n╔════════════════════════════════════════════╗');
    console.log('║  TEAM AI CONTROLLER - DEBUG START          ║');
    console.log('╚════════════════════════════════════════════╝');
    
    console.log('📋 Full JWT user object:', JSON.stringify(req.user, null, 2));
    console.log('✓ businessId:', req.user.businessId);
    console.log('✓ business?.id:', req.user.business?.id);
    console.log('✓ businessOwnerId:', req.user.businessOwnerId);
    console.log('✓ sub:', req.user.sub);
    console.log('✓ id:', req.user.id);
    
    // Try every possible field name
    const businessId = req.user.businessId 
      || req.user.business?.id
      || req.user.businessOwnerId
      || req.user.sub
      || req.user.id;
    
    console.log('🔍 Using businessId for query:', businessId);
    
    if (!businessId) {
      console.log('❌ Business ID not found - tried all possible fields');
      return {
        success: false,
        error: 'Business ID not found in token',
      };
    }

    console.log('✅ JWT validated, businessId:', businessId);
    const predictions = await this.teamAiService.getPredictions(businessId);
    console.log('📤 Returning predictions response');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  TEAM AI CONTROLLER - DEBUG END            ║');
    console.log('╚════════════════════════════════════════════╝\n');
    return predictions;
  }
}
