const WSDL_URL_PRODUCTION = 'https://api.invoice4u.co.il/Services/ApiService.svc?singleWsdl';
const WSDL_URL_STAGING = 'https://apiqa.invoice4u.co.il/Services/ApiService.svc?singleWsdl';

export enum DocumentType {
  Invoice = 1,
  Receipt = 2,
  InvoiceReceipt = 3,
  InvoiceCredit = 4,
  ProformaInvoice = 5,
  InvoiceOrder = 6,
  InvoiceQuote = 7,
  InvoiceShip = 8,
  Deposits = 9,
}

export enum PaymentType {
  CreditCard = 1,
  Check = 2,
  MoneyTransfer = 3,
  Cash = 4,
  Credit = 5,
  Other = 7,
  Bit = 8,
  PayBox = 9,
}

export interface Invoice4UConfig {
  email: string;
  password: string;
  useProduction?: boolean;
}

export interface DocumentItem {
  Code?: string;
  Name: string;
  Price: number;
  Quantity: number;
}

export interface AssociatedEmail {
  Mail: string;
  IsUserMail: boolean;
}

export interface CreateDocumentRequest {
  ClientID?: number;
  DocumentType: DocumentType;
  Subject: string;
  Currency: string;
  TaxIncluded: boolean;
  TaxPercentage: number;
  RoundAmount?: number;
  Items?: DocumentItem[];
  AssociatedEmails: AssociatedEmail[];
  ApiIdentifier?: string;
}

export interface Invoice4UCustomer {
  ID?: number;
  Name: string;
  Email?: string;
  Phone?: string;
  Address?: string;
  City?: string;
  UniqueID?: string;
  Active?: boolean;
}

class Invoice4UClient {
  private config: Invoice4UConfig;
  private client: any = null;
  private token: string | null = null;

  constructor(config: Invoice4UConfig) {
    this.config = config;
  }

  private async getClient() {
    if (!this.client) {
      const wsdlUrl = this.config.useProduction ? WSDL_URL_PRODUCTION : WSDL_URL_STAGING;
      // Dynamic import for soap to work with Next.js
      const soap = await import('soap');
      this.client = await soap.createClientAsync(wsdlUrl);
    }
    return this.client;
  }

  async login(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    try {
      const client = await this.getClient();
      const wsdlUrl = this.config.useProduction ? WSDL_URL_PRODUCTION : WSDL_URL_STAGING;
      
      console.log('=== Invoice4U Login Attempt ===');
      console.log('Email:', this.config.email);
      console.log('Environment:', this.config.useProduction ? 'Production' : 'Staging');
      console.log('WSDL URL:', wsdlUrl);
      
      // נוודא שאין רווחים
      const cleanEmail = this.config.email.trim();
      const cleanPassword = this.config.password.trim();
      
      console.log('Calling VerifyLoginAsync...');
      const result = await client.VerifyLoginAsync({
        email: cleanEmail,
        password: cleanPassword,
      });

      console.log('Raw API Response:', JSON.stringify(result, null, 2));

      // בדיקה אם יש שגיאות מהשרת
      if (result[0]?.Errors && result[0].Errors.length > 0) {
        console.error('API returned errors:', result[0].Errors);
        throw new Error(`Invoice4U API Error: ${JSON.stringify(result[0].Errors)}`);
      }

      this.token = result[0]?.VerifyLoginResult;
      
      if (!this.token || this.token === null || this.token === '') {
        console.error('Login failed - no token received');
        console.error('Full response:', result);
        throw new Error('Login failed - No token received from Invoice4U. Please verify your credentials.');
      }

      console.log('✅ Login successful! Token:', this.token.substring(0, 15) + '...');
      return this.token;
    } catch (error: any) {
      console.error('=== Invoice4U Login Error ===');
      console.error('Error type:', error.constructor?.name);
      console.error('Error message:', error.message);
      
      // בדיקה אם זו שגיאת SOAP
      if (error.root) {
        console.error('SOAP Error details:', JSON.stringify(error.root, null, 2));
      }
      
      // הודעת שגיאה ברורה יותר
      let errorMessage = 'Invalid credentials';
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to Invoice4U servers. Please check your internet connection.';
      } else if (error.message.includes('No token received')) {
        errorMessage = 'Email or password is incorrect. Please verify your credentials work on Invoice4U website.';
      }
      
      throw new Error(errorMessage);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.login();
      const client = await this.getClient();
      const result = await client.IsAuthenticatedAsync({ token });
      return result[0].IsAuthenticatedResult !== null;
    } catch (error) {
      return false;
    }
  }

  async createCustomer(customer: Invoice4UCustomer): Promise<any> {
    const token = await this.login();
    const client = await this.getClient();

    const result = await client.CreateCustomerAsync({
      cu: {
        Name: customer.Name,
        Email: customer.Email || '',
        Phone: customer.Phone || '',
        Address: customer.Address || '',
        City: customer.City || '',
        UniqueID: customer.UniqueID || '',
        Active: customer.Active !== false,
      },
      token,
    });

    const response = result[0].CreateCustomerResult;
    if (response.Errors && response.Errors.length > 0) {
      throw new Error(`Failed to create customer: ${JSON.stringify(response.Errors)}`);
    }

    return response;
  }

  async getCustomers(searchCriteria: Partial<Invoice4UCustomer> = {}): Promise<any[]> {
    const token = await this.login();
    const client = await this.getClient();

    const result = await client.GetCustomersAsync({
      cust: {
        Name: searchCriteria.Name || '',
        Active: searchCriteria.Active !== false,
        ...searchCriteria,
      },
      token,
    });

    const response = result[0].GetCustomersResult;
    return response.Response || [];
  }

  async createDocument(doc: CreateDocumentRequest): Promise<any> {
    const token = await this.login();
    const client = await this.getClient();

    const result = await client.CreateDocumentAsync({
      doc: {
        ClientID: doc.ClientID,
        DocumentType: doc.DocumentType,
        Subject: doc.Subject,
        Currency: doc.Currency || 'ILS',
        TaxIncluded: doc.TaxIncluded !== false,
        TaxPercentage: doc.TaxPercentage || 17,
        RoundAmount: doc.RoundAmount || 0,
        Items: doc.Items || [],
        AssociatedEmails: doc.AssociatedEmails,
        ApiIdentifier: doc.ApiIdentifier || `crm_${Date.now()}`,
      },
      token,
    });

    const response = result[0].CreateDocumentResult;
    if (response.Errors && response.Errors.length > 0) {
      throw new Error(`Failed to create document: ${JSON.stringify(response.Errors)}`);
    }

    return response;
  }

  async getDocument(docId: string): Promise<any> {
    const token = await this.login();
    const client = await this.getClient();

    const result = await client.GetDocumentAsync({
      docId,
      token,
    });

    return result[0].GetDocumentResult;
  }

  async getDocuments(filters: any = {}): Promise<any[]> {
    const token = await this.login();
    const client = await this.getClient();

    const result = await client.GetDocumentsAsync({
      dr: {
        ReportType: 'Document',
        ...filters,
      },
      token,
    });

    const response = result[0].GetDocumentsResult;
    return response.Response || [];
  }
}

export function createInvoice4UClient(config: Invoice4UConfig): Invoice4UClient {
  return new Invoice4UClient(config);
}

export default Invoice4UClient;

