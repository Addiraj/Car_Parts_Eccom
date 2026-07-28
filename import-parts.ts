import 'dotenv/config';
import fs from 'fs';
import csv from 'csv-parser';
import { models, sequelize } from './src/lib/db/index.server';

async function importParts() {
    const filePath = 'F:\\lovable_supabase\\STOCK UPLOAD OLD WEBSITE.csv';
    const batchSize = 1000;
    
    console.log("Starting import process...");
    
    // First cache brands
    const brandCache = new Map<string, string>(); // name to id
    const existingBrands = await models.brands.findAll();
    existingBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id));
    
    let partsBatch: any[] = [];
    let totalImported = 0;
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', async (row: any) => {
                const category = row['Category Name']?.trim();
                const partNumber = row['Part Number']?.trim() || row['Brand Part No.']?.trim();
                const brandName = row['Brand']?.trim();
                const description = row['Description']?.trim();
                const quantity = parseInt(row['Quantity']) || 0;
                const rate = parseFloat(row['Rate']) || 0;
                const indPrice = parseFloat(row['IND']) || rate;
                const garPrice = parseFloat(row['GAR']) || rate;
                const exportPrice = parseFloat(row['EXPORT']) || rate;
                
                if (!partNumber) return; // Skip empty rows
                
                let brandId = null;
                if (brandName) {
                    const brandKey = brandName.toLowerCase();
                    if (!brandCache.has(brandKey)) {
                        // Create brand on the fly synchronously in this context would be tricky inside on('data')
                        // We will just let it be null or handle it in a pre-processing step. 
                        // But wait, parts table allows brand_id to be null. We'll set manufacturer to brandName instead.
                    } else {
                        brandId = brandCache.get(brandKey);
                    }
                }
                
                partsBatch.push({
                    part_number: String(partNumber).substring(0, 255),
                    name: String(description || "Unknown Part").substring(0, 255),
                    oem_number: String(partNumber).substring(0, 255),
                    description: String(description || "No Description").substring(0, 1000),
                    stock: quantity,
                    price: rate,
                    ind_price: indPrice,
                    gar_price: garPrice,
                    export_price: exportPrice,
                    category_tag: category ? String(category).substring(0, 255) : null,
                    manufacturer: brandName ? String(brandName).substring(0, 255) : null,
                    brand_id: brandId,
                    is_oem: false,
                    low_stock_threshold: 5
                });
                
                if (partsBatch.length >= batchSize) {
                    // Do nothing, just collect all into memory. 4.5MB is tiny.
                }
            })
            .on('end', async () => {
                console.log(`Finished reading CSV. Found ${partsBatch.length} parts in memory. Inserting...`);
                try {
                    // For a 4.5MB file, all rows easily fit in memory (approx 30,000 rows).
                    // We can insert them in chunks of 2000
                    const chunkSize = 2000;
                    for (let i = 0; i < partsBatch.length; i += chunkSize) {
                        const chunk = partsBatch.slice(i, i + chunkSize);
                        await models.parts.bulkCreate(chunk, { ignoreDuplicates: true });
                        totalImported += chunk.length;
                        console.log(`Inserted chunk ${i / chunkSize + 1} (${totalImported} total)`);
                    }
                    console.log('CSV file successfully processed');
                    resolve(true);
                } catch (e) {
                    console.error('Error during bulkCreate:', e);
                    reject(e);
                }
            });
    });
}

importParts().then(() => {
    console.log("Import Complete!");
    process.exit(0);
}).catch(console.error);
