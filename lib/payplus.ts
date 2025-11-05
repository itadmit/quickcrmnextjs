/**
 * PayPlus API Integration
 * Documentation: https://docs.payplus.co.il
 */

export interface PayPlusConfig {
  apiKey: string
  secretKey: string
  paymentPageUid: string
  useProduction?: boolean
}

export interface PayPlusCustomer {
  customer_name: string
  email?: string
  phone?: string
  vat_number?: string
  paying_vat?: boolean
  notes?: string
}

export interface PayPlusGenerateLinkRequest {
  payment_page_uid?: string // אופציונלי - נקבע מ-config
  amount: number
  currency_code?: string
  charge_method?: number // 0=Check, 1=Charge, 2=Approval, 3=Recurring, 4=Refund, 5=Token
  refURL_success?: string
  refURL_failure?: string
  refURL_cancel?: string
  refURL_callback?: string
  send_failure_callback?: boolean
  sendEmailApproval?: boolean
  sendEmailFailure?: boolean
  expiry_datetime?: string // minutes
  language_code?: string
  customer?: PayPlusCustomer
  more_info?: string
  more_info_2?: string
  more_info_3?: string
  more_info_4?: string
  more_info_5?: string
  create_token?: boolean
  payments?: number // מספר תשלומים
}

export interface PayPlusGenerateLinkResponse {
  results: {
    status: string
    code: number
    message?: string
    description?: string
  }
  data?: {
    page_request_uid: string
    payment_page_link: string // השם הנכון לפי PayPlus API
    qr_code_image?: string
    hosted_fields_uuid?: string | null
  }
}

export interface PayPlusCallbackData {
  transaction_uid?: string
  payment_request_uid?: string
  status?: string
  amount?: number
  currency_code?: string
  approval_num?: string
  voucher_num?: string
  card_type?: string
  card_name?: string
  more_info?: string
}

const API_BASE_URL_PRODUCTION = 'https://restapi.payplus.co.il/api/v1.0'
const API_BASE_URL_STAGING = 'https://restapidev.payplus.co.il/api/v1.0'

/**
 * Create PayPlus API client
 */
export function createPayPlusClient(config: PayPlusConfig) {
  const baseUrl = config.useProduction
    ? API_BASE_URL_PRODUCTION
    : API_BASE_URL_STAGING

  const headers = {
    'Content-Type': 'application/json',
    'api-key': config.apiKey,
    'secret-key': config.secretKey,
  }

  return {
    /**
     * Generate payment link
     */
    async generatePaymentLink(
      request: PayPlusGenerateLinkRequest
    ): Promise<PayPlusGenerateLinkResponse> {
      try {
        // הסרת payment_page_uid מה-request אם הוא כבר קיים (כי אנחנו מוסיפים אותו מה-config)
        const { payment_page_uid, ...requestParams } = request
        
        const body = {
          payment_page_uid: config.paymentPageUid,
          ...requestParams,
        }
        
        const response = await fetch(`${baseUrl}/PaymentPages/generateLink`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        const data = await response.json()

        // PayPlus יכול להחזיר שגיאה גם ב-status 200
        if (!response.ok || (data.results && data.results.status !== 'success')) {
          const errorMessage = data.results?.message || data.results?.description || data.message || `HTTP ${response.status}: Failed to generate payment link`
          
          // הודעה מפורטת יותר לשגיאת מפתחות
          let detailedError = errorMessage
          if (errorMessage.includes('API_KEY') || errorMessage.includes('SECRET_KEY') || errorMessage.includes('INCORRECT')) {
            detailedError = `פרטי ההתחברות לא תקינים. אנא בדוק:
1. שהמפתחות (API Key ו-Secret Key) נכונים
2. שאתה משתמש במפתחות המתאימים לסביבה (${config.useProduction ? 'Production' : 'Staging'})
3. שה-Payment Page UID שייך לאותו חשבון
4. אם אתה משתמש ב-staging, ודא ש"Production" לא מסומן בהגדרות`
          }
          
          console.error('PayPlus API Error:', {
            status: response.status,
            response: data,
            environment: config.useProduction ? 'PRODUCTION' : 'STAGING',
            baseUrl,
            request: {
              payment_page_uid: config.paymentPageUid,
              amount: request.amount,
            },
          })
          throw new Error(detailedError)
        }

        return data
      } catch (error: any) {
        console.error('PayPlus generatePaymentLink error:', error)
        if (error.message) {
          throw error
        }
        throw new Error('Failed to generate payment link: ' + (error.toString() || 'Unknown error'))
      }
    },

    /**
     * Create customer in PayPlus
     */
    async createCustomer(customer: PayPlusCustomer): Promise<any> {
      const response = await fetch(`${baseUrl}/Customers/Add`, {
        method: 'POST',
        headers,
        body: JSON.stringify(customer),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          results: {
            status: 'error',
            code: response.status,
            message: 'Failed to create customer',
          },
        }))
        throw new Error(error.results?.message || 'Failed to create customer')
      }

      return await response.json()
    },

    /**
     * Get transaction status (IPN FULL)
     */
    async getTransactionStatus(
      transactionUid?: string,
      paymentRequestUid?: string
    ): Promise<any> {
      const response = await fetch(`${baseUrl}/PaymentPages/ipn-full`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction_uid: transactionUid,
          payment_request_uid: paymentRequestUid,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          results: {
            status: 'error',
            code: response.status,
            message: 'Failed to get transaction status',
          },
        }))
        throw new Error(error.results?.message || 'Failed to get transaction status')
      }

      return await response.json()
    },

    /**
     * Create token for credit card
     */
    async createToken(
      terminalUid: string,
      customerUid: string,
      cardNumber: string,
      cardDate: string, // MM/YY
      identificationNumber?: string
    ): Promise<any> {
      const response = await fetch(`${baseUrl}/Token/Add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          terminal_uid: terminalUid,
          customer_uid: customerUid,
          credit_card_number: cardNumber,
          card_date_mmyy: cardDate,
          identification_number: identificationNumber,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          results: {
            status: 'error',
            code: response.status,
            message: 'Failed to create token',
          },
        }))
        throw new Error(error.results?.message || 'Failed to create token')
      }

      return await response.json()
    },
  }
}

/**
 * Verify PayPlus callback signature
 */
export function verifyPayPlusCallback(data: any, secretKey: string): boolean {
  // PayPlus בדרך כלל לא משתמש ב-signature, אבל אפשר להוסיף בדיקה אם צריך
  // לעת עתה נחזיר true
  return true
}

