import { Injectable } from '@nestjs/common';
import { AnalyticsService, AnalyticsFilters } from './analytics.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async exportToCSV(type: string, filters: AnalyticsFilters): Promise<string> {
    switch (type) {
      case 'overview':
        return this.exportOverviewCSV(filters);
      case 'daily':
        return this.exportDailyCSV(filters);
      case 'weekly':
        return this.exportWeeklyCSV(filters);
      case 'monthly':
        return this.exportMonthlyCSV(filters);
      case 'locations':
        return this.exportLocationsCSV(filters);
      case 'hosts':
        return this.exportHostsCSV(filters);
      case 'purposes':
        return this.exportPurposesCSV(filters);
      case 'retention':
        return this.exportRetentionCSV(filters);
      default:
        throw new Error(`Unsupported export type: ${type}`);
    }
  }

  async exportToPDF(type: string, filters: AnalyticsFilters): Promise<Buffer> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        await this.generatePDFContent(doc, type, filters);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async exportOverviewCSV(filters: AnalyticsFilters): Promise<string> {
    const [visitMetrics, locationMetrics, hostMetrics, purposeMetrics] = await Promise.all([
      this.analyticsService.getVisitMetrics(filters),
      this.analyticsService.getLocationMetrics(filters),
      this.analyticsService.getHostMetrics(filters),
      this.analyticsService.getPurposeMetrics(filters),
    ]);

    let csv = 'Analytics Overview Report\n\n';
    
    // Visit Metrics
    csv += 'Visit Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Total Visits,${visitMetrics.totalVisits}\n`;
    csv += `Checked In,${visitMetrics.checkedInVisits}\n`;
    csv += `Checked Out,${visitMetrics.checkedOutVisits}\n`;
    csv += `No Shows,${visitMetrics.noShowVisits}\n`;
    csv += `Average Wait Time (minutes),${visitMetrics.averageWaitTime.toFixed(2)}\n`;
    csv += `Average Visit Duration (minutes),${visitMetrics.averageVisitDuration.toFixed(2)}\n`;
    csv += `Peak Hour,${visitMetrics.peakHour}:00\n`;
    csv += `Peak Day,${visitMetrics.peakDay}\n\n`;

    // Location Metrics
    csv += 'Location Performance\n';
    csv += 'Location,Total Visits,Average Duration (min),Peak Hour\n';
    locationMetrics.forEach(location => {
      csv += `"${location.locationName}",${location.totalVisits},${location.averageDuration.toFixed(2)},${location.peakHour}:00\n`;
    });
    csv += '\n';

    // Host Metrics
    csv += 'Host Performance\n';
    csv += 'Host,Total Visits,Average Wait Time (min),Average Duration (min)\n';
    hostMetrics.forEach(host => {
      csv += `"${host.hostName}",${host.totalVisits},${host.averageWaitTime.toFixed(2)},${host.averageDuration.toFixed(2)}\n`;
    });
    csv += '\n';

    // Purpose Metrics
    csv += 'Visit Purposes\n';
    csv += 'Purpose,Total Visits,Percentage,Average Duration (min)\n';
    purposeMetrics.forEach(purpose => {
      csv += `${purpose.purpose},${purpose.totalVisits},${purpose.percentage}%,${purpose.averageDuration.toFixed(2)}\n`;
    });

    return csv;
  }

  private async exportDailyCSV(filters: AnalyticsFilters): Promise<string> {
    const dailyData = await this.analyticsService.getDailyVisitCounts(filters);
    
    let csv = 'Daily Visit Counts\n';
    csv += 'Date,Visits\n';
    
    dailyData.forEach(day => {
      csv += `${day.date},${day.visits}\n`;
    });

    return csv;
  }

  private async exportWeeklyCSV(filters: AnalyticsFilters): Promise<string> {
    const weeklyData = await this.analyticsService.getWeeklyVisitCounts(filters);
    
    let csv = 'Weekly Visit Counts\n';
    csv += 'Week Starting,Visits\n';
    
    weeklyData.forEach(week => {
      csv += `${week.week},${week.visits}\n`;
    });

    return csv;
  }

  private async exportMonthlyCSV(filters: AnalyticsFilters): Promise<string> {
    const monthlyData = await this.analyticsService.getMonthlyVisitCounts(filters);
    
    let csv = 'Monthly Visit Counts\n';
    csv += 'Month,Visits\n';
    
    monthlyData.forEach(month => {
      csv += `${month.month},${month.visits}\n`;
    });

    return csv;
  }

  private async exportLocationsCSV(filters: AnalyticsFilters): Promise<string> {
    const locationMetrics = await this.analyticsService.getLocationMetrics(filters);
    
    let csv = 'Location Analytics\n';
    csv += 'Location,Total Visits,Average Duration (min),Peak Hour\n';
    
    locationMetrics.forEach(location => {
      csv += `"${location.locationName}",${location.totalVisits},${location.averageDuration.toFixed(2)},${location.peakHour}:00\n`;
    });

    return csv;
  }

  private async exportHostsCSV(filters: AnalyticsFilters): Promise<string> {
    const hostMetrics = await this.analyticsService.getHostMetrics(filters);
    
    let csv = 'Host Analytics\n';
    csv += 'Host,Total Visits,Average Wait Time (min),Average Duration (min)\n';
    
    hostMetrics.forEach(host => {
      csv += `"${host.hostName}",${host.totalVisits},${host.averageWaitTime.toFixed(2)},${host.averageDuration.toFixed(2)}\n`;
    });

    return csv;
  }

  private async exportPurposesCSV(filters: AnalyticsFilters): Promise<string> {
    const purposeMetrics = await this.analyticsService.getPurposeMetrics(filters);
    
    let csv = 'Purpose Analytics\n';
    csv += 'Purpose,Total Visits,Percentage,Average Duration (min)\n';
    
    purposeMetrics.forEach(purpose => {
      csv += `${purpose.purpose},${purpose.totalVisits},${purpose.percentage}%,${purpose.averageDuration.toFixed(2)}\n`;
    });

    return csv;
  }

  private async exportRetentionCSV(filters: AnalyticsFilters): Promise<string> {
    const retentionData = await this.analyticsService.getVisitorRetentionData(filters);
    
    let csv = 'Visitor Retention Analytics\n';
    csv += 'Period,New Visitors,Returning Visitors,Total Visitors,Retention Rate (%)\n';
    
    retentionData.forEach(period => {
      csv += `${period.period},${period.newVisitors},${period.returningVisitors},${period.totalVisitors},${period.retentionRate}%\n`;
    });

    return csv;
  }

  private async generatePDFContent(doc: PDFKit.PDFDocument, type: string, filters: AnalyticsFilters) {
    // PDF Header
    doc.fontSize(20).text('VMS Analytics Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.fontSize(12).text(`Report Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`, 50, 100);
    
    // Add filters info
    let yPosition = 130;
    if (filters.fromDate || filters.toDate) {
      const dateRange = `${filters.fromDate?.toLocaleDateString() || 'Beginning'} - ${filters.toDate?.toLocaleDateString() || 'Present'}`;
      doc.text(`Date Range: ${dateRange}`, 50, yPosition);
      yPosition += 20;
    }

    yPosition += 20;

    switch (type) {
      case 'overview':
        await this.generateOverviewPDF(doc, filters, yPosition);
        break;
      case 'daily':
        await this.generateDailyPDF(doc, filters, yPosition);
        break;
      case 'weekly':
        await this.generateWeeklyPDF(doc, filters, yPosition);
        break;
      case 'monthly':
        await this.generateMonthlyPDF(doc, filters, yPosition);
        break;
      case 'locations':
        await this.generateLocationsPDF(doc, filters, yPosition);
        break;
      case 'hosts':
        await this.generateHostsPDF(doc, filters, yPosition);
        break;
      case 'purposes':
        await this.generatePurposesPDF(doc, filters, yPosition);
        break;
      case 'retention':
        await this.generateRetentionPDF(doc, filters, yPosition);
        break;
    }
  }

  private async generateOverviewPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const [visitMetrics, locationMetrics, hostMetrics, purposeMetrics] = await Promise.all([
      this.analyticsService.getVisitMetrics(filters),
      this.analyticsService.getLocationMetrics(filters),
      this.analyticsService.getHostMetrics(filters),
      this.analyticsService.getPurposeMetrics(filters),
    ]);

    // Visit Metrics Section
    doc.fontSize(16).text('Visit Overview', 50, yPosition);
    yPosition += 30;

    doc.fontSize(12);
    doc.text(`Total Visits: ${visitMetrics.totalVisits}`, 50, yPosition);
    doc.text(`Checked In: ${visitMetrics.checkedInVisits}`, 200, yPosition);
    doc.text(`Checked Out: ${visitMetrics.checkedOutVisits}`, 350, yPosition);
    yPosition += 20;

    doc.text(`No Shows: ${visitMetrics.noShowVisits}`, 50, yPosition);
    doc.text(`Avg Wait Time: ${visitMetrics.averageWaitTime.toFixed(1)} min`, 200, yPosition);
    doc.text(`Avg Duration: ${visitMetrics.averageVisitDuration.toFixed(1)} min`, 350, yPosition);
    yPosition += 20;

    doc.text(`Peak Hour: ${visitMetrics.peakHour}:00`, 50, yPosition);
    doc.text(`Peak Day: ${visitMetrics.peakDay}`, 200, yPosition);
    yPosition += 40;

    // Top Locations
    if (locationMetrics.length > 0) {
      doc.fontSize(14).text('Top Locations', 50, yPosition);
      yPosition += 25;
      
      doc.fontSize(10);
      locationMetrics.slice(0, 5).forEach((location, index) => {
        doc.text(`${index + 1}. ${location.locationName}: ${location.totalVisits} visits`, 50, yPosition);
        yPosition += 15;
      });
      yPosition += 20;
    }

    // Top Hosts
    if (hostMetrics.length > 0) {
      doc.fontSize(14).text('Top Hosts', 50, yPosition);
      yPosition += 25;
      
      doc.fontSize(10);
      hostMetrics.slice(0, 5).forEach((host, index) => {
        doc.text(`${index + 1}. ${host.hostName}: ${host.totalVisits} visits`, 50, yPosition);
        yPosition += 15;
      });
      yPosition += 20;
    }

    // Purpose Distribution
    if (purposeMetrics.length > 0) {
      doc.fontSize(14).text('Visit Purposes', 50, yPosition);
      yPosition += 25;
      
      doc.fontSize(10);
      purposeMetrics.forEach((purpose) => {
        doc.text(`${purpose.purpose}: ${purpose.totalVisits} visits (${purpose.percentage}%)`, 50, yPosition);
        yPosition += 15;
      });
    }
  }

  private async generateDailyPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const dailyData = await this.analyticsService.getDailyVisitCounts(filters);
    
    doc.fontSize(16).text('Daily Visit Counts', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    dailyData.forEach((day) => {
      doc.text(`${day.date}: ${day.visits} visits`, 50, yPosition);
      yPosition += 15;
      
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generateWeeklyPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const weeklyData = await this.analyticsService.getWeeklyVisitCounts(filters);
    
    doc.fontSize(16).text('Weekly Visit Counts', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    weeklyData.forEach((week) => {
      doc.text(`Week of ${week.week}: ${week.visits} visits`, 50, yPosition);
      yPosition += 15;
      
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generateMonthlyPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const monthlyData = await this.analyticsService.getMonthlyVisitCounts(filters);
    
    doc.fontSize(16).text('Monthly Visit Counts', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    monthlyData.forEach((month) => {
      doc.text(`${month.month}: ${month.visits} visits`, 50, yPosition);
      yPosition += 15;
      
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generateLocationsPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const locationMetrics = await this.analyticsService.getLocationMetrics(filters);
    
    doc.fontSize(16).text('Location Analytics', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    locationMetrics.forEach((location) => {
      doc.text(`${location.locationName}:`, 50, yPosition);
      doc.text(`  Visits: ${location.totalVisits}`, 50, yPosition + 12);
      doc.text(`  Avg Duration: ${location.averageDuration.toFixed(1)} min`, 50, yPosition + 24);
      doc.text(`  Peak Hour: ${location.peakHour}:00`, 50, yPosition + 36);
      yPosition += 55;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generateHostsPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const hostMetrics = await this.analyticsService.getHostMetrics(filters);
    
    doc.fontSize(16).text('Host Analytics', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    hostMetrics.forEach((host) => {
      doc.text(`${host.hostName}:`, 50, yPosition);
      doc.text(`  Visits: ${host.totalVisits}`, 50, yPosition + 12);
      doc.text(`  Avg Wait Time: ${host.averageWaitTime.toFixed(1)} min`, 50, yPosition + 24);
      doc.text(`  Avg Duration: ${host.averageDuration.toFixed(1)} min`, 50, yPosition + 36);
      yPosition += 55;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generatePurposesPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const purposeMetrics = await this.analyticsService.getPurposeMetrics(filters);
    
    doc.fontSize(16).text('Purpose Analytics', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    purposeMetrics.forEach((purpose) => {
      doc.text(`${purpose.purpose}:`, 50, yPosition);
      doc.text(`  Visits: ${purpose.totalVisits} (${purpose.percentage}%)`, 50, yPosition + 12);
      doc.text(`  Avg Duration: ${purpose.averageDuration.toFixed(1)} min`, 50, yPosition + 24);
      yPosition += 45;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  private async generateRetentionPDF(doc: PDFKit.PDFDocument, filters: AnalyticsFilters, yPosition: number) {
    const retentionData = await this.analyticsService.getVisitorRetentionData(filters);
    
    doc.fontSize(16).text('Visitor Retention Analytics', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    retentionData.forEach((period) => {
      doc.text(`Week of ${period.period}:`, 50, yPosition);
      doc.text(`  New: ${period.newVisitors}, Returning: ${period.returningVisitors}`, 50, yPosition + 12);
      doc.text(`  Total: ${period.totalVisitors}, Retention: ${period.retentionRate}%`, 50, yPosition + 24);
      yPosition += 45;
      
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }
}