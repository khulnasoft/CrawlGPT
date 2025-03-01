import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define file paths
const inputFilePath = path.join(__dirname, '../output-1.json');
const outputFilePath = path.join(__dirname, '../processed-output.json');

async function processOutput() {
  try {
    // Read the input file
    console.log(`Reading data from ${inputFilePath}...`);
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const data = JSON.parse(rawData);
    
    // Extract titles and URLs
    const processedData = data.map(item => ({
      title: item.title,
      url: item.url
    }));
    
    // Write the processed data to the output file
    console.log(`Writing processed data to ${outputFilePath}...`);
    fs.writeFileSync(
      outputFilePath, 
      JSON.stringify(processedData, null, 2), 
      'utf8'
    );
    
    console.log(`Processing complete! Found ${processedData.length} entries.`);
    console.log(`Summary saved to ${outputFilePath}`);
  } catch (error) {
    console.error('Error processing the output file:', error.message);
    process.exit(1);
  }
}

// Execute the function
processOutput();

