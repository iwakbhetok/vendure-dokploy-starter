import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [ProductImportController],
    providers: [ProductImportService],
    dashboard: './dashboard',
    compatibility: '^3.0.0',
})
export class ProductImportPlugin {}
