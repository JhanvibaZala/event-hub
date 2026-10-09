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
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventSearchDto } from './dto/event-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({
    summary:
      'Search and list events with server-side pagination, filters, and sorting (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated events retrieved successfully with metadata.',
  })
  @Get()
  async findAll(@Query() query: EventQueryDto) {
    return this.eventsService.findAll(query, true);
  }

  @ApiOperation({
    summary:
      'Search and list events via POST body with complex filtering, multi-sorting, and keyset pagination (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated events retrieved successfully with metadata.',
  })
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(@Body() dto: EventSearchDto) {
    return this.eventsService.search(dto, true);
  }

  @ApiOperation({
    summary:
      'Search and list events created by the authenticated admin with data isolation (Admin Hub)',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Paginated admin events retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/search')
  @HttpCode(HttpStatus.OK)
  async searchAdmin(
    @Body() dto: EventSearchDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.searchForAdmin(dto, user);
  }

  @ApiOperation({
    summary:
      'List events created by the authenticated admin with query params (Admin Hub)',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Paginated admin events retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin')
  async findAllAdmin(
    @Query() query: EventQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findAllForAdmin(query, user);
  }

  @ApiOperation({ summary: 'Get single admin event for editing (Admin only)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Event details retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  async findOneAdmin(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.findByIdForAdmin(id, user);
  }

  @ApiOperation({ summary: 'Get single event by ID or slug (Public)' })
  @ApiResponse({ status: 200, description: 'Event details retrieved.' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.eventsService.findByIdOrSlug(idOrSlug);
  }

  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Event created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.create(dto, user.id);
  }

  @ApiOperation({ summary: 'Update event details (Admin only)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Delete event (Admin only)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Event deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires event ownership' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.eventsService.delete(id, user);
  }
}
