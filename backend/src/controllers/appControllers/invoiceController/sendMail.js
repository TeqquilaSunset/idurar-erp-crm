// src/controllers/appControllers/invoiceController/sendMail.js
const { sendEmail } = require('../../../services/emailService');
const { SendInvoice } = require('../../../emailTemplate/SendEmailTemplate');
const Invoice = require('../../../models/appModels/Invoice');
const logger = require('../../../utils/logger');
const path = require('path');
const fs = require('fs');

const mail = async (req, res) => {
  try {
    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Получаем ID из req.body как 'id' ---
    const { id, recipientEmail, subject, customBody } = req.body;

    // Используем id, как он пришел в теле запроса
    const invoiceData = await Invoice.findById(id).populate('client');

    if (!invoiceData || invoiceData.removed) {
      logger.warn(`Attempt to send email for non-existent or removed Invoice ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Invoice not found or removed.' });
    }

    const customerName = invoiceData.client ? invoiceData.client.name : 'Customer';
    const recipientEmailFinal = recipientEmail || (invoiceData.client ? invoiceData.client.email : null);

    if (!recipientEmailFinal) {
      logger.error(`No recipient email found for Invoice ID: ${id}`);
      return res.status(400).json({ success: false, message: 'Recipient email is missing.' });
    }

    // Форматирование даты с учетом текущего времени в Латвии
    const invoiceDate = invoiceData.date ? new Date(invoiceData.date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Riga'
    }) : new Date().toLocaleString('en-US', { timeZone: 'Europe/Riga' });

    const invoiceIdentifier = invoiceData.number ? `Invoice #${invoiceData.number}/${invoiceData.year}` : `Invoice ID: ${id}`;
    const mailSubject = subject || `${invoiceIdentifier} from Idurar`;

    const htmlContent = SendInvoice({
      title: mailSubject,
      name: customerName,
      time: invoiceDate,
    });

    let textContent = `Hello ${customerName},\n\nHere's ${invoiceIdentifier} you requested, dated ${invoiceDate}.\n\n`;
    if (customBody) {
        textContent += `${customBody}\n\n`;
    }
    let invoicePdfPath = null;
    if (invoiceData.pdf && process.env.PUBLIC_SERVER_FILE) {
        invoicePdfPath = `${process.env.PUBLIC_SERVER_FILE}${invoiceData.pdf}`;
        textContent += `You can view and download your invoice here: ${invoicePdfPath}\n\n`;
    }
    textContent += `Best regards,\nIdurar ERP CRM Team`;

    const attachments = [];
    if (invoiceData.pdf) {
        const filePath = path.join(__dirname, '../../../../public', invoiceData.pdf);
        try {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                attachments.push({
                    filename: `invoice_${invoiceData.number || id}.pdf`,
                    content: fileContent,
                    contentType: 'application/pdf',
                });
                logger.info(`Attached PDF file: ${filePath}`);
            } else {
                logger.warn(`PDF file not found at expected path: ${filePath} for Invoice ID: ${id}`);
            }
        } catch (fileError) {
            logger.error(`Failed to read PDF for Invoice ID ${id} from ${filePath}: ${fileError.message}`);
        }
    }

    await sendEmail(
      recipientEmailFinal,
      mailSubject,
      htmlContent,
      textContent,
      attachments
    );

    res.status(200).json({
      success: true,
      result: null,
      message: 'Email sent successfully',
    });
  } catch (error) {
    logger.error('Error in invoice mail controller:', {
      error: error.message,
      stack: error.stack,
      invoiceId: req.body.id, // Логируем id, которое пришло в теле запроса
      recipient: req.body.recipientEmail,
    });
    res.status(500).json({
      success: false,
      result: null,
      message: 'Failed to send email',
      error: error.message,
    });
  }
};

module.exports = mail;