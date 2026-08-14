import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchService, SearchFilters, PaginationSort } from './search.service';

@Controller('public')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  async search(@Query() query: any) {
    const filters: SearchFilters = {
      locality: query.locality,
      minRent: query.minRent ? Number(query.minRent) : undefined,
      maxRent: query.maxRent ? Number(query.maxRent) : undefined,
      minDeposit: query.minDeposit ? Number(query.minDeposit) : undefined,
      maxDeposit: query.maxDeposit ? Number(query.maxDeposit) : undefined,
      bedrooms: query.bedrooms ? Number(query.bedrooms) : undefined,
      furnishing: query.furnishing,
      propertyType: query.propertyType,
      availability: query.availability
        ? new Date(query.availability)
        : undefined,
    };

    const pagination: PaginationSort = {
      skip: query.skip ? Number(query.skip) : undefined,
      take: query.take ? Number(query.take) : undefined,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    };

    return this.searchService.searchListings(filters, pagination);
  }

  @Get('listings/:id')
  async getListing(@Param('id') id: string) {
    return this.searchService.getPublicListing(id);
  }
}
