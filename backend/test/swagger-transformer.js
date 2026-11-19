// Chạy plugin Swagger của Nest khi ts-jest biên dịch — e2e kiểm tra được tài liệu đúng như bản `nest build`.
const transformer = require('@nestjs/swagger/plugin');

module.exports.name = 'nestjs-swagger-transformer';
module.exports.version = 1;
module.exports.factory = (cs) =>
  transformer.before({ classValidatorShim: true, introspectComments: true, dtoFileNameSuffix: ['.dto.ts'] }, cs.program);
