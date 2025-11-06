/**
 * Invoice4U Clearing APIs Client
 * 
 * זהו API נפרד מהממשק למסמכים - משמש לביצוע תשלומים (clearing)
 * 
 * Documentation: Invoice4U Clearing APIs
 */

export enum ClearingType {
  Regular = 1,
  Payments = 2,
  CreditPayments = 3,
  Refund = 4,
}

export enum CreditCardCompanyType {
  Meshulam = 7,
  UPay = 6,
  YaadSarig = 12,
}

export interface Invoice4UClearingConfig {
  apiKey?: string; // מומלץ - Invoice4UUserApiKey
  email?: string; // אלטרנטיבה אם אין API Key
  password?: string; // אלטרנטיבה אם אין API Key
  useProduction?: boolean;
}

export interface ClearingRequest {
  // Authentication
  Invoice4UUserApiKey?: string;
  Invoice4UUserEmail?: string;
  Invoice4UUserPassword?: string;

  // Clearing Type
  Type: ClearingType; // Regular = 1, Payments = 2, CreditPayments = 3, Refund = 4
  CreditCardCompanyType?: CreditCardCompanyType; // Meshulam = 7, UPay = 6, YaadSarig = 12

  // Customer Info
  CustomerId?: number; // אם קיים - חיפוש לקוח לפי ID
  IsAutoCreateCustomer?: boolean; // אם true - יצירת לקוח חדש אוטומטית
  FullName: string;
  Phone: string;
  Email: string;

  // Payment Details
  Sum: number; // סכום התשלום
  Description?: string;
  PaymentsNum?: number; // מספר תשלומים
  Currency?: string; // "ILS"
  OrderIdClientUsage?: string; // מזהה מזהה הזמנה שלך

  // Document Creation (Optional)
  IsDocCreate?: boolean; // אם true - יצירת מסמך עם התשלום
  DocHeadline?: string; // כותרת המסמך
  DocComments?: string; // הערות למסמך
  IsManualDocCreationsWithParams?: boolean; // שימוש בפרמטרים ידניים
  DocItemName?: string; // שמות פריטים מופרדים ב-|
  DocItemQuantity?: string; // כמויות מופרדות ב-|
  DocItemPrice?: string; // מחירים מופרדים ב-|
  DocItemTaxRate?: string; // אחוזי מס מופרדים ב-|
  IsItemsBase64Encoded?: boolean;

  // Tokenization
  AddToken?: boolean; // שמירת טוקן אחרי התשלום
  AddTokenAndCharge?: boolean; // שמירת טוקן וחיוב מיידי
  ChargeWithToken?: boolean; // חיוב עם טוקן קיים

  // Standing Order (תשלומים חוזרים)
  IsStandingOrderClearance?: boolean;
  StandingOrderDuration?: number; // מספר חודשים (למשל 12)
  StandingOrderCallBackUrl?: string; // URL ל-callback לאחר תשלום

  // Refund
  Refund?: boolean; // האם לבצע החזרה
  PaymentId?: string; // ID התשלום להחזרה (אם Refund = true)

  // Bit Payment
  IsBitPayment?: boolean; // תשלום דרך Bit

  // Other
  IsGeneralClient?: boolean;
  ReturnUrl?: string; // URL להחזרה אחרי התשלום
}

export interface ClearingResponse {
  __type?: string;
  Errors?: ClearingError[] | null;
  Info?: any[] | null;
  OpenInfo?: Array<{
    Key: string;
    Value: string;
  }> | null;
  ClearingRedirectUrl?: string; // URL ל-clearing iframe
  ClearingTraceId?: string; // מזהה יחיד לעסקה (מתוך OpenInfo)
  PaymentId?: string | null; // מזהה תשלום (מתוך OpenInfo)
  I4UClearingLogId?: string; // מזהה clearing log (מתוך OpenInfo)
  // כל השדות מהבקשה מוחזרים גם בתגובה
  [key: string]: any;
}

export interface ClearingError {
  Error?: string;
  ErrorCode?: number;
  Explanation?: string;
}

export interface ClearingLog {
  __type?: string;
  Errors?: any[];
  Info?: any[];
  OpenInfo?: any[];
  Id: number;
  PaymentId?: string;
  Amount: number;
  ClearingTraceId?: string;
  ClientName?: string;
  IsSuccess?: boolean;
  Date?: string; // פורמט: "/Date(1663933622000+0300)/"
  Currency?: number;
  CurrencyName?: string;
  ClearingCompany?: number;
  ClearingCompanyName?: string;
  ClearingConfirmationNumber?: string;
  IsDocumentCreated?: boolean;
  IsToken?: boolean;
  IsBitPayment?: boolean;
  ErrorMessage?: string;
  [key: string]: any;
}

export interface ClearingLogSearchParams {
  PaymentId?: string;
  FromAmount?: number;
  ToAmount?: number;
  IsSuccess?: boolean;
  [key: string]: any;
}

class Invoice4UClearingClient {
  private config: Invoice4UClearingConfig;
  private baseUrl: string;

  constructor(config: Invoice4UClearingConfig) {
    this.config = config;
    this.baseUrl = config.useProduction
      ? 'https://api.invoice4u.co.il'
      : 'https://apiqa.invoice4u.co.il';
  }

  /**
   * ProcessApiRequestV2 - ביצוע תשלום (clearing)
   * 
   * מחזיר URL ל-clearing iframe שצריך להציג למשתמש
   * 
   * לפי הדוקומנטציה:
   * - הבקשה: { "request": { ... } }
   * - התגובה: { ClearingRedirectUrl, OpenInfo: [{ Key: "ClearingTraceId", Value: "..." }], ... }
   */
  async processClearingRequest(request: ClearingRequest): Promise<ClearingResponse> {
    try {
      // הכנת הבקשה בפורמט המדויק
      // Invoice4U Clearing מצפה לסטרינגים 'true'/'false' ולא בוליאנים
      
      // וידוא שהסכום תקין
      const sumValue = request.Sum;
      if (!sumValue || sumValue <= 0 || isNaN(sumValue)) {
        throw new Error(`סכום לא תקין: ${sumValue}`);
      }
      
      const apiRequest: any = {
        Type: request.Type.toString(),
        FullName: request.FullName || '',
        Phone: request.Phone || '',
        Email: request.Email || '',
        Sum: sumValue.toString(),
        Currency: request.Currency || 'ILS',
        PaymentsNum: request.PaymentsNum?.toString() || '1',
        IsAutoCreateCustomer: (request.IsAutoCreateCustomer !== false).toString(),
        IsGeneralClient: (request.IsGeneralClient !== false).toString(),
        // CreditCardCompanyType - נדרש לפי הדוקומנטציה
        CreditCardCompanyType: request.CreditCardCompanyType?.toString() || '6', // UPay כברירת מחדל
      };
      
      console.log('Invoice4U Clearing Request (before auth):', {
        ...apiRequest,
        Sum: apiRequest.Sum,
        SumType: typeof apiRequest.Sum,
      });

      // הוספת פרטי אימות
      if (this.config.apiKey) {
        apiRequest.Invoice4UUserApiKey = this.config.apiKey;
      } else if (this.config.email && this.config.password) {
        apiRequest.Invoice4UUserEmail = this.config.email;
        apiRequest.Invoice4UUserPassword = this.config.password;
      } else {
        throw new Error('נדרש API Key או Email + Password');
      }

      // הוספת שדות אופציונליים
      // CreditCardCompanyType כבר נוסף למעלה, אבל אם יש ערך אחר נשתמש בו
      if (request.CreditCardCompanyType && request.CreditCardCompanyType.toString() !== apiRequest.CreditCardCompanyType) {
        apiRequest.CreditCardCompanyType = request.CreditCardCompanyType.toString();
      }
      if (request.CustomerId) {
        apiRequest.CustomerId = request.CustomerId.toString();
      }
      if (request.Description) {
        apiRequest.Description = request.Description;
      }
      if (request.OrderIdClientUsage) {
        apiRequest.OrderIdClientUsage = request.OrderIdClientUsage;
      }
      if (request.ReturnUrl) {
        apiRequest.ReturnUrl = request.ReturnUrl;
      }
      if (request.IsDocCreate) {
        apiRequest.IsDocCreate = 'true';
        if (request.DocHeadline) {
          apiRequest.DocHeadline = request.DocHeadline;
        }
        if (request.DocComments) {
          apiRequest.Comments = request.DocComments;
        }
        if (request.IsManualDocCreationsWithParams) {
          apiRequest.IsManualDocCreationsWithParams = 'true';
          if (request.DocItemName) {
            apiRequest.DocItemName = request.DocItemName;
          }
          if (request.DocItemQuantity) {
            apiRequest.DocItemQuantity = request.DocItemQuantity;
          }
          if (request.DocItemPrice) {
            apiRequest.DocItemPrice = request.DocItemPrice;
          }
          if (request.DocItemTaxRate) {
            apiRequest.DocItemTaxRate = request.DocItemTaxRate;
          }
          if (request.IsItemsBase64Encoded !== undefined) {
            apiRequest.IsItemsBase64Encoded = request.IsItemsBase64Encoded.toString();
          }
        }
      }
      if (request.AddToken) {
        apiRequest.AddToken = 'true';
      }
      if (request.AddTokenAndCharge) {
        apiRequest.AddTokenAndCharge = 'true';
      }
      if (request.ChargeWithToken) {
        apiRequest.ChargeWithToken = 'true';
      }
      if (request.Refund) {
        apiRequest.Refund = 'true';
        if (request.PaymentId) {
          apiRequest.PaymentId = request.PaymentId;
        }
      }
      if (request.IsStandingOrderClearance) {
        apiRequest.IsStandingOrderClearance = 'true';
        if (request.StandingOrderDuration) {
          apiRequest.StandingOrderDuration = request.StandingOrderDuration.toString();
        }
        if (request.StandingOrderCallBackUrl) {
          apiRequest.StandingOrderCallBackUrl = request.StandingOrderCallBackUrl;
        }
      }
      if (request.IsBitPayment) {
        apiRequest.IsBitPayment = 'true';
      }

      // קריאה ל-REST API (לא SOAP!)
      // לפי התיעוד: POST https://api.invoice4u.co.il/Services/ApiService.svc/ProcessApiRequestV2
      const apiUrl = `${this.baseUrl}/Services/ApiService.svc/ProcessApiRequestV2`;
      
      // הבקשה בפורמט: { request: { ... } }
      // כל הערכים צריכים להיות סטרינגים לפי התיעוד
      const requestBody = {
        request: apiRequest,
      };
      
      console.log('REST API Request URL:', apiUrl);
      console.log('REST API Request body:', JSON.stringify(requestBody, null, 2));

      try {
        const fetchResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Invoice4U Clearing API HTTP Error:', fetchResponse.status, errorText);
          throw new Error(`Invoice4U Clearing API HTTP Error: ${fetchResponse.status} - ${errorText}`);
        }

        const result = await fetchResponse.json();
        console.log('REST API Response:', JSON.stringify(result, null, 2));

        // לפי התיעוד, התגובה היא בפורמט של ApiClearingRequest object
        // Invoice4U REST API מחזיר את התגובה בתוך שדה "d" (כנראה .NET wrapper)
        // התגובה יכולה להיות ישירות את ה-response, או בתוך שדה d או request
        // נבדוק את כל האפשרויות
        let rawResponse: any;
        
        // אם יש "d" (שדה .NET wrapper) - זה הפורמט הנפוץ של Invoice4U REST API
        if (result.d && typeof result.d === 'object') {
          rawResponse = result.d;
          console.log('Extracted response from "d" field');
        }
        // אם יש ProcessApiRequestV2Result (מקרה של SOAP wrapper)
        else if (result.ProcessApiRequestV2Result) {
          rawResponse = result.ProcessApiRequestV2Result;
          console.log('Extracted response from ProcessApiRequestV2Result');
        }
        // אם יש request (התגובה מחזירה את הבקשה עם הערכים)
        else if (result.request) {
          rawResponse = result.request;
          console.log('Extracted response from "request" field');
        }
        // אחרת - התגובה היא ישירות
        else {
          rawResponse = result;
          console.log('Using response directly');
        }
        
        console.log('Parsed Response:', JSON.stringify(rawResponse, null, 2));
        console.log('ClearingRedirectUrl exists?', !!rawResponse?.ClearingRedirectUrl);
        console.log('ClearingRedirectUrl value:', rawResponse?.ClearingRedirectUrl);
        
        const response = rawResponse as ClearingResponse;

        if (!response) {
          throw new Error('No response from ProcessApiRequestV2');
        }

        // בדיקה אם התגובה היא ערכי ברירת מחדל - זה אומר שהבקשה לא עובדה
        // נבדוק גם אם יש ClearingRedirectUrl - אם אין, זה אומר שהבקשה לא הצליחה
        const hasDefaultValues = response.Sum === 0 && 
                                 response.IsAutoCreateCustomer === false &&
                                 !response.ClearingRedirectUrl;

        if (hasDefaultValues) {
          console.error('Response appears to be default values - request may not have been processed correctly');
          console.error('Full response object:', JSON.stringify(response, null, 2));
          console.error('Check if there are Errors in response:', response.Errors);
          console.error('Check if there is Info in response:', response.Info);
          console.error('Check if there is OpenInfo in response:', response.OpenInfo);
          
          // אם יש שגיאות, נזרוק אותן
          if (response.Errors && Array.isArray(response.Errors) && response.Errors.length > 0) {
            const errorMessages = response.Errors.map((err: any) => {
              if (typeof err === 'string') return err;
              return err.Error || err.Explanation || JSON.stringify(err);
            });
            throw new Error(`Clearing Error: ${errorMessages.join(', ')}`);
          }
          
          // בדיקה אם ה-API Key תקין - אולי הוא לא מורשה ל-Clearing
          const possibleReasons = [
            'API Key לא מורשה ל-Clearing APIs - נסה להשתמש ב-Email + Password',
            'האינטגרציה לא מוגדרת נכון ב-Invoice4U',
            'הבקשה לא תקינה - נסה לבדוק את כל השדות הנדרשים',
            'השרת QA של Invoice4U לא תומך ב-Clearing כמו שצריך - נסה עם Production',
          ];
          
          throw new Error(`הבקשה לא עובדה נכון - התגובה מחזירה ערכים ברירת מחדל. אפשרויות: ${possibleReasons.join('; ')}`);
        }

        // בדיקת שגיאות - גם אם Errors הוא null או undefined, נבדוק
        if (response.Errors) {
          if (Array.isArray(response.Errors) && response.Errors.length > 0) {
            const errorMessages = response.Errors.map((err: any) => {
              if (typeof err === 'string') return err;
              return err.Error || err.Explanation || JSON.stringify(err);
            });
            throw new Error(`Clearing Error: ${errorMessages.join(', ')}`);
          }
        }
        
        // אם אין ClearingRedirectUrl, נבדוק אם יש שגיאות או מידע אחר
        if (!response.ClearingRedirectUrl) {
          console.error('Missing ClearingRedirectUrl in response. Full response:', JSON.stringify(response, null, 2));
          
          // אם יש Info (הודעות מידע), נציג אותן
          if (response.Info && Array.isArray(response.Info) && response.Info.length > 0) {
            console.log('Info messages:', response.Info);
          }
          
          // אם הסכום הוא 0, זה אומר שהבקשה לא הייתה תקינה
          if (response.Sum === 0 || !response.Sum) {
            throw new Error('הבקשה לא הייתה תקינה - הסכום הוא 0 או חסר');
          }
          
          throw new Error('לא התקבל URL ל-clearing. ייתכן שהבקשה לא הייתה תקינה או שהאינטגרציה לא מוגדרת נכון.');
        }

        // חילוץ פרמטרים חשובים מ-OpenInfo
        if (response.OpenInfo && Array.isArray(response.OpenInfo)) {
          response.OpenInfo.forEach((item) => {
            if (item.Key === 'ClearingTraceId') {
              response.ClearingTraceId = item.Value;
            } else if (item.Key === 'PaymentId') {
              response.PaymentId = item.Value;
            } else if (item.Key === 'I4UClearingLogId') {
              response.I4UClearingLogId = item.Value;
            }
          });
        }

        return response;
      } catch (apiError: any) {
        console.error('Invoice4U Clearing API Error:', apiError);
        
        // אם זו שגיאת fetch, נזהה אותה
        if (apiError.message && apiError.message.includes('fetch')) {
          throw new Error(`Invoice4U Clearing API Connection Error: ${apiError.message}`);
        }
        
        throw new Error(`Invoice4U Clearing API Error: ${apiError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Invoice4U Clearing Error:', error);
      throw new Error(
        error.message || 'Failed to process clearing request'
      );
    }
  }

  /**
   * VerifyLogin - יצירת טוקן לאימות
   * 
   * משמש ל-GetClearingLogById ו-GetClearingLogByParams
   */
  async verifyLogin(): Promise<string> {
    if (!this.config.email || !this.config.password) {
      throw new Error('Email and password are required for VerifyLogin');
    }

    try {
      const soap = await import('soap');
      const wsdlUrl = `${this.baseUrl}/Services/ApiService.svc?singleWsdl`;
      const client = await soap.createClientAsync(wsdlUrl);

      const result = await client.VerifyLoginAsync({
        email: this.config.email.trim(),
        password: this.config.password.trim(),
      });

      const token = result[0]?.VerifyLoginResult;

      if (!token) {
        throw new Error('Failed to get token from VerifyLogin');
      }

      return token;
    } catch (error: any) {
      console.error('Invoice4U VerifyLogin Error:', error);
      throw new Error(
        error.message || 'Failed to verify login'
      );
    }
  }

  /**
   * GetClearingLogByParams - קבלת מידע על תשלום לפי פרמטרים
   * 
   * לפי הדוקומנטציה:
   * - הבקשה: { "searchParams": { PaymentId, FromAmount, ToAmount, IsSuccess }, "token": "..." }
   * - התגובה: ClearingLog object
   */
  async getClearingLogByParams(
    token: string,
    searchParams?: ClearingLogSearchParams
  ): Promise<ClearingLog> {
    try {
      const soap = await import('soap');
      const wsdlUrl = `${this.baseUrl}/Services/ApiService.svc?singleWsdl`;
      const client = await soap.createClientAsync(wsdlUrl);

      // הבקשה בפורמט: { searchParams: { ... }, token: "..." }
      const result = await client.GetClearingLogByParamsAsync({
        searchParams: searchParams || {},
        token,
      });

      const log = result[0]?.GetClearingLogByParamsResult as ClearingLog;

      if (!log) {
        throw new Error('No clearing log found');
      }

      // בדיקת שגיאות
      if (log.Errors && Array.isArray(log.Errors) && log.Errors.length > 0) {
        throw new Error(`Clearing Log Error: ${JSON.stringify(log.Errors)}`);
      }

      return log;
    } catch (error: any) {
      console.error('GetClearingLogByParams Error:', error);
      throw new Error(
        error.message || 'Failed to get clearing log by params'
      );
    }
  }

  /**
   * GetClearingLogById - קבלת מידע על תשלום לפי ID
   * 
   * לפי הדוקומנטציה:
   * - הבקשה: { "clearingLogId": "xxxxx", "token": "..." }
   * - התגובה: ClearingLog object
   */
  async getClearingLogById(
    token: string,
    clearingLogId: number | string
  ): Promise<ClearingLog> {
    try {
      const soap = await import('soap');
      const wsdlUrl = `${this.baseUrl}/Services/ApiService.svc?singleWsdl`;
      const client = await soap.createClientAsync(wsdlUrl);

      // הבקשה בפורמט: { clearingLogId: "...", token: "..." }
      const result = await client.GetClearingLogByIdAsync({
        clearingLogId: clearingLogId.toString(),
        token,
      });

      const log = result[0]?.GetClearingLogByIdResult as ClearingLog;

      if (!log) {
        throw new Error('No clearing log found');
      }

      // בדיקת שגיאות
      if (log.Errors && Array.isArray(log.Errors) && log.Errors.length > 0) {
        throw new Error(`Clearing Log Error: ${JSON.stringify(log.Errors)}`);
      }

      return log;
    } catch (error: any) {
      console.error('GetClearingLogById Error:', error);
      throw new Error(
        error.message || 'Failed to get clearing log by id'
      );
    }
  }
}

/**
 * Factory function to create Invoice4U Clearing client
 */
export function createInvoice4UClearingClient(
  config: Invoice4UClearingConfig
): Invoice4UClearingClient {
  return new Invoice4UClearingClient(config);
}

export default Invoice4UClearingClient;

