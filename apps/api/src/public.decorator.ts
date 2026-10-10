import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE = 'alsvid:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
