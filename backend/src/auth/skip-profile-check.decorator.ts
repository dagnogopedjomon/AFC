import { SetMetadata } from '@nestjs/common';

export const SKIP_PROFILE_CHECK_KEY = 'skipProfileCheck';

export const SkipProfileCheck = () => SetMetadata(SKIP_PROFILE_CHECK_KEY, true);
