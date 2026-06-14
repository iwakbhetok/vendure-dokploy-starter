import { Injectable } from '@nestjs/common';
import { Importer, ImportParser, Logger, RequestContext } from '@vendure/core';
import * as XLSX from 'xlsx';

const loggerCtx = 'ProductImportService';

@Injectable()
export class ProductImportService {
    constructor(
        private importParser: ImportParser,
        private importer: Importer,
    ) {}

    getTemplateCSV(): string {
        const lines = [
            'name,slug,description,assets,facets,optionGroups,optionValues,sku,price,taxCategory,stockOnHand,trackInventory,variantAssets,variantFacets',
            '"Simple Product","simple-product","A simple product with no variants.","","","","","SIMPLE-001","2999","standard","100","true","",""',
            '"Product With Variants","product-with-variants","A product with size variants.","","","Size","S","PWV-S","1999","standard","50","true","",""',
            '"","","","","","","M","PWV-M","1999","standard","50","true","",""',
            '"","","","","","","L","PWV-L","1999","standard","50","true","",""',
        ];
        return lines.join('\n') + '\n';
    }

    async parseFileToCSV(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
        const name = originalName.toLowerCase();
        const isExcel =
            mimetype.includes('sheet') ||
            mimetype.includes('excel') ||
            name.endsWith('.xlsx') ||
            name.endsWith('.xls');

        if (isExcel) {
            Logger.info(`Converting Excel file to CSV: ${originalName}`, loggerCtx);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_csv(sheet);
        }

        return buffer.toString('utf-8');
    }

    async importProducts(
        ctx: RequestContext,
        csvContent: string,
    ): Promise<{ imported: number; processed: number; errors: string[] }> {
        const { results, errors, processed } = await this.importParser.parseProducts(csvContent);

        if (errors && errors.length > 0) {
            return { imported: 0, processed: processed ?? 0, errors };
        }

        if (!results || results.length === 0) {
            return { imported: 0, processed: 0, errors: ['No valid products found in file.'] };
        }

        Logger.info(`Parsed ${results.length} products, beginning import...`, loggerCtx);

        const importErrors = await this.importer.importProducts(ctx, results, (progress) => {
            Logger.debug(`Importing: ${progress.currentProduct}`, loggerCtx);
        });

        const imported = results.length - importErrors.length;
        Logger.info(`Import complete: ${imported} imported, ${importErrors.length} errors`, loggerCtx);

        return {
            imported,
            processed: processed ?? results.length,
            errors: importErrors,
        };
    }
}
