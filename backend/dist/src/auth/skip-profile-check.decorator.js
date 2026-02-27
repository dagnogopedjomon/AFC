"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipProfileCheck = exports.SKIP_PROFILE_CHECK_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_PROFILE_CHECK_KEY = 'skipProfileCheck';
const SkipProfileCheck = () => (0, common_1.SetMetadata)(exports.SKIP_PROFILE_CHECK_KEY, true);
exports.SkipProfileCheck = SkipProfileCheck;
//# sourceMappingURL=skip-profile-check.decorator.js.map