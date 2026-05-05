# ZAK Bank Statement to CSV Converter

A Node.js tool to convert ZAK bank statements from PDF to CSV format, enabling easy data analysis and record-keeping.

## Features

- 🔒 **Secure Local Processing**: All conversions happen on your machine - no data leaves your system
- 📊 **CSV Export**: Converts PDF statements into structured CSV format
- 🕒 **Transaction Details**: Captures dates, descriptions, amounts, and balances
- 🌟 **Type Safety**: Built with JSDoc type annotations for better code reliability

## Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/marcschneider/zak-bank-statement-to-csv.git
   cd zak-bank-statement-to-csv
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Usage

1. Place your ZAK bank statement PDFs in the `input` directory
2. Run the converter:
   ```bash
   npm start
   ```
3. Find the resulting CSV file in the `output` directory

## CSV Output Format

The generated CSV includes the following columns:
- `date`: Transaction date (YYYY-MM-DD)
- `title`: Transaction title
- `description`: Detailed transaction description
- `incoming`: Incoming amount (if applicable)
- `outgoing`: Outgoing amount (if applicable)

## Technologies Used

- **Node.js**: JavaScript runtime for executing the conversion script
- **pdfreader**: Library for reading and parsing PDF files

## Development

To contribute to this project, please fork the repository and submit a pull request. Ensure your code follows the existing style guidelines and passes all lint checks.

### Running Tests

To run tests, use the following command:
```bash
npm test
```

### Linting

To lint the code, use the following command:
```bash
npm run lint
```

### Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

This tool processes financial data locally on your machine. No data is transmitted externally.

## Acknowledgments

- Built with [pdfreader](https://www.npmjs.com/package/pdfreader) for PDF parsing
