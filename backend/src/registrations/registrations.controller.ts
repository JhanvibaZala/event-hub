import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('registrations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @ApiOperation({ summary: 'Register for an event ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket registered successfully. Dispatches async RabbitMQ job.',
  })
  @ApiResponse({ status: 400, description: 'Event not published' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 409, description: 'Already registered' })
  @Post('registrations/:eventId')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Param('eventId') eventId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.registrationsService.register(eventId, user.id);
  }

  @ApiOperation({ summary: 'Get current user registrations with event details' })
  @ApiResponse({ status: 200, description: 'Registrations retrieved successfully' })
  @Get('registrations/my')
  async getMyRegistrations(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.registrationsService.getMyRegistrations(user.id, query);
  }

  @ApiOperation({ summary: 'Cancel an event registration' })
  @ApiResponse({ status: 200, description: 'Registration cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden: Cannot cancel another user ticket' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  @Delete('registrations/:id')
  async cancelRegistration(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.registrationsService.cancelRegistration(id, user.id, isAdmin);
  }

  @ApiOperation({ summary: 'Get all registrations for an event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Attendee list retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/events/:eventId/registrations')
  async getEventAttendees(
    @Param('eventId') eventId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.registrationsService.getEventAttendees(eventId, query);
  }
}
