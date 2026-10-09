import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventSearchDto } from './dto/event-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin-events')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({
    summary:
      'Search events created by the authenticated admin with data isolation (Admin Hub)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated admin events retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() dto: EventSearchDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.searchForAdmin(dto, user);
  }

  @ApiOperation({
    summary:
      'List events created by the authenticated admin with query params (Admin Hub)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated admin events retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @Get()
  async findAll(
    @Query() query: EventQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findAllForAdmin(query, user);
  }

  @ApiOperation({ summary: 'Get single admin event by ID (Owner only)' })
  @ApiResponse({ status: 200, description: 'Event details retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findByIdForAdmin(id, user);
  }

  @ApiOperation({ summary: 'Update event details (Owner only)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete event (Owner only)' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.delete(id, user);
  }
}
