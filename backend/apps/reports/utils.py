"""
Utilities for generating PDF and Excel reports.
"""
from io import BytesIO
import xlsxwriter
from django.template.loader import render_to_string
# from weasyprint import HTML  # Uncomment when using PDF generation


def generate_pdf_report(data, template_name):
    """
    Generate PDF report from template.

    Note: WeasyPrint requires additional system dependencies.
    For now, returning a placeholder. Install WeasyPrint dependencies:
    - On Ubuntu: apt-get install python3-dev python3-pip python3-setuptools python3-wheel python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
    - On macOS: brew install cairo pango gdk-pixbuf libffi
    """
    # Placeholder implementation
    # html_content = render_to_string(f'reports/{template_name}.html', data)
    # pdf_file = HTML(string=html_content).write_pdf()
    # return pdf_file

    # For now, return a simple text
    return b"PDF generation requires WeasyPrint setup. Please configure system dependencies."


def generate_excel_report(data, report_type):
    """
    Generate Excel report.
    """
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet()

    # Define formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#4472C4',
        'font_color': 'white',
        'border': 1
    })
    cell_format = workbook.add_format({'border': 1})

    if report_type == 'project_summary':
        # Project Summary Report
        worksheet.write('A1', 'Отчет по проекту', header_format)
        worksheet.write('A2', 'Проект:', cell_format)
        worksheet.write('B2', data['project'].name, cell_format)
        worksheet.write('A3', 'Дата формирования:', cell_format)
        worksheet.write('B3', data['generated_at'].strftime('%d.%m.%Y %H:%M'), cell_format)

        # Statistics
        worksheet.write('A5', 'Статистика:', header_format)
        worksheet.write('A6', 'Всего замечаний:', cell_format)
        worksheet.write('B6', data['total_issues'], cell_format)
        worksheet.write('A7', 'Выполнено:', cell_format)
        worksheet.write('B7', data['completed'], cell_format)
        worksheet.write('A8', 'В процессе:', cell_format)
        worksheet.write('B8', data['in_progress'], cell_format)
        worksheet.write('A9', 'Просрочено:', cell_format)
        worksheet.write('B9', data['overdue'], cell_format)

        # Issues list
        worksheet.write('A11', 'Список замечаний:', header_format)
        headers = ['№', 'Название', 'Участок', 'Статус', 'Приоритет', 'Исполнитель', 'Срок']
        for col, header in enumerate(headers):
            worksheet.write(11, col, header, header_format)

        row = 12
        for idx, issue in enumerate(data['issues'], 1):
            worksheet.write(row, 0, idx, cell_format)
            worksheet.write(row, 1, issue.title, cell_format)
            worksheet.write(row, 2, issue.site.name, cell_format)
            worksheet.write(row, 3, issue.get_status_display(), cell_format)
            worksheet.write(row, 4, issue.get_priority_display(), cell_format)
            worksheet.write(row, 5, issue.assigned_to.get_full_name() if issue.assigned_to else '-', cell_format)
            worksheet.write(row, 6, issue.deadline.strftime('%d.%m.%Y') if issue.deadline else '-', cell_format)
            row += 1

    elif report_type == 'contractor_performance':
        # Contractor Performance Report
        worksheet.write('A1', 'Отчет по исполнителю', header_format)
        worksheet.write('A2', 'Исполнитель:', cell_format)
        worksheet.write('B2', data['contractor'].get_full_name(), cell_format)
        worksheet.write('A3', 'Период:', cell_format)
        period = f"{data.get('start_date', 'Начало')} - {data.get('end_date', 'Сейчас')}"
        worksheet.write('B3', period, cell_format)

        # Statistics
        worksheet.write('A5', 'Статистика выполнения:', header_format)
        worksheet.write('A6', 'Всего назначено:', cell_format)
        worksheet.write('B6', data['total_assigned'], cell_format)
        worksheet.write('A7', 'Выполнено:', cell_format)
        worksheet.write('B7', data['completed'], cell_format)
        worksheet.write('A8', 'В процессе:', cell_format)
        worksheet.write('B8', data['in_progress'], cell_format)
        worksheet.write('A9', 'Просрочено:', cell_format)
        worksheet.write('B9', data['overdue'], cell_format)

        if data['total_assigned'] > 0:
            completion_rate = (data['completed'] / data['total_assigned']) * 100
            worksheet.write('A10', 'Процент выполнения:', cell_format)
            worksheet.write('B10', f"{completion_rate:.1f}%", cell_format)

    elif report_type == 'overdue_issues':
        # Overdue Issues Report
        worksheet.write('A1', 'Просроченные замечания', header_format)
        worksheet.write('A2', 'Дата формирования:', cell_format)
        worksheet.write('B2', data['generated_at'].strftime('%d.%m.%Y %H:%M'), cell_format)
        worksheet.write('A3', 'Всего просрочено:', cell_format)
        worksheet.write('B3', data['total_overdue'], cell_format)

        # Issues list
        headers = ['№', 'Проект', 'Название', 'Участок', 'Исполнитель', 'Срок', 'Просрочено на (дней)']
        for col, header in enumerate(headers):
            worksheet.write(5, col, header, header_format)

        row = 6
        from django.utils import timezone
        now = timezone.now()

        for idx, issue in enumerate(data['issues'], 1):
            worksheet.write(row, 0, idx, cell_format)
            worksheet.write(row, 1, issue.project.name, cell_format)
            worksheet.write(row, 2, issue.title, cell_format)
            worksheet.write(row, 3, issue.site.name, cell_format)
            worksheet.write(row, 4, issue.assigned_to.get_full_name() if issue.assigned_to else '-', cell_format)
            worksheet.write(row, 5, issue.deadline.strftime('%d.%m.%Y %H:%M') if issue.deadline else '-', cell_format)

            if issue.deadline:
                days_overdue = (now - issue.deadline).days
                worksheet.write(row, 6, days_overdue, cell_format)
            else:
                worksheet.write(row, 6, '-', cell_format)

            row += 1

    # Adjust column widths
    worksheet.set_column('A:A', 20)
    worksheet.set_column('B:G', 25)

    workbook.close()
    output.seek(0)
    return output.getvalue()
