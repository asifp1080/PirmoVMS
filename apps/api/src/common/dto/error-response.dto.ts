import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error information',
    example: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: {
        field: 'email',
        constraint: 'must be a valid email address',
      },
    },
  })
  error: {
    code: string;
    message: string;
    details?: any;
  };
}