"""Build the portfolio's one-page profiles from the same content as the website.

Requires reportlab. English uses PDF standard fonts; Chinese uses an embedded
TrueType font supplied with --chinese-font (Windows SimHei is the local default).
"""

import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "src/content/profile.json").read_text(encoding="utf-8"))
INK = colors.HexColor("#251c2d")
MUTED = colors.HexColor("#625966")
ACCENT = colors.HexColor("#854b34")
LINE = colors.HexColor("#d6cbd1")
PROJECTS = {project["id"]: project for project in DATA["cases"]}


def link(label, url):
    return f'<link href="{escape(url, {chr(34): "&quot;"})}" color="#854b34">{escape(label)}</link>'


def build(role, output, chinese=False):
    regular = "KaiChinese" if chinese else "Helvetica"
    bold = regular if chinese else "Helvetica-Bold"
    styles = {
        "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=31, leading=35, textColor=INK, spaceAfter=3),
        "role": ParagraphStyle("role", fontName=bold, fontSize=13, leading=19, textColor=INK, spaceAfter=6),
        "contact": ParagraphStyle("contact", fontName=regular, fontSize=9, leading=14, textColor=MUTED),
        "section": ParagraphStyle("section", fontName=bold, fontSize=9, leading=13, textColor=ACCENT, spaceBefore=15, spaceAfter=8),
        "project": ParagraphStyle("project", fontName=bold, fontSize=11.5, leading=16, textColor=INK, spaceBefore=5, spaceAfter=3),
        "meta": ParagraphStyle("meta", fontName=regular, fontSize=8.6, leading=12.5, textColor=MUTED, spaceAfter=5),
        "body": ParagraphStyle("body", fontName=regular, fontSize=10.2, leading=14.8, textColor=INK, spaceAfter=5),
        "bullet": ParagraphStyle("bullet", fontName=regular, fontSize=10, leading=14.5, textColor=INK, leftIndent=10, firstLineIndent=-10, spaceAfter=4),
    }
    story = []

    def add(kind, text):
        story.append(Paragraph(text, styles[kind]))

    role_title = "前端开发 / React · TypeScript" if chinese else role["title"]
    add("name", DATA["name"])
    add("role", role_title)
    contact = "中国，UTC+8 | 远程项目 | 邮件 / 文字沟通" if chinese else "China, UTC+8 | Remote projects | Email / chat"
    add("contact", link(DATA["email"], "mailto:" + DATA["email"]) + " &nbsp; | &nbsp; " + contact)
    url = DATA["portfolio"] + "#/profile/" + role["id"]
    add("contact", link("luoy16002-svg.github.io/kai-works", url) + " &nbsp; | &nbsp; " + link("GitHub / source & tests", DATA["github"]))
    story.extend([Spacer(1, 12), HRFlowable(width="100%", thickness=0.7, color=LINE), Spacer(1, 13)])
    summary = "使用 React、TypeScript 开发数据工具和交互式产品界面，关注响应式布局、异常状态和可复现验证。以下为独立作品，提供可运行演示、源码及说明文档；寻找范围明确的远程开发项目。" if chinese else role["summary"]
    add("body", escape(summary))
    add("section", "技术能力" if chinese else "TECHNICAL SKILLS")
    add("body", escape(role["skills"]))
    add("section", "独立项目 | 2026" if chinese else "SELECTED INDEPENDENT PROJECTS | 2026")
    zh_bullets = {
        "current": ["实现 CSV 导入、筛选与导出；使用 Web Worker 处理解析和查询，配合虚拟表格与导入取消，减少主线程阻塞。", "以独立 BigInt 参考校验 100,000 条合成记录，并使用 Python csv、Decimal 核对浏览器导出的行数与金额。"],
        "relay": ["基于 IndexedDB 实现原子任务领取、租约过期回收、旧令牌拒绝，以及与完成状态同事务提交的本地记账。", "记录 Edge 浏览器中断并刷新后的恢复过程：1,000 个任务最终产生 1,000 条唯一的本地记账结果。"],
        "halo": ["使用 Three.js 构建响应式产品配置器，支持程序化几何、材质与尺寸调整、URL 分享、PNG 和 JSON 导出。", "验证 900 组配置序列化往返，覆盖零亮度；处理参数边界、减少动态效果偏好和 WebGL 不可用时的降级。"],
    }
    for project_id in role["cases"]:
        project = PROJECTS[project_id]
        add("project", escape(project["name"]))
        case_url = DATA["portfolio"] + "#/case/" + project_id
        sample_url = project.get("article", case_url)
        sample_label = "案例与验证" if chinese else "Writing sample" if project.get("article") else "Case notes & evidence"
        add("meta", escape(project["stack"]) + " &nbsp; | &nbsp; " + link(sample_label, sample_url))
        for bullet in zh_bullets[project_id] if chinese else project["resume"]:
            add("bullet", "- " + escape(bullet))
    add("section", "合作方式" if chinese else "WORKING ARRANGEMENT")
    working = "通过书面需求、可运行预览和文字反馈推进；交付源码、运行说明与相关检查。可从小范围付费试做开始，开工前确定范围、交期和付款方式。" if chinese else DATA["working"]
    add("body", escape(working))

    def footer(canvas, document):
        if document.page > 1:
            raise ValueError(f"Profile overflowed one page: {role['file']}")
        canvas.saveState()
        canvas.setFont(regular, 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(44, 25, "Kai | 独立项目能力简介 | 2026 年 9 月" if chinese else "Kai | Independent project profile | September 2026")
        canvas.restoreState()

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=34, bottomMargin=42, title=f"Kai - {role_title}", author="Kai")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

    text_lines = ["Kai", role_title, contact, DATA["email"], "Portfolio: " + url, "Source: " + DATA["github"], "", summary, "", "技术能力" if chinese else "TECHNICAL SKILLS", role["skills"], "", "独立项目 | 2026" if chinese else "SELECTED INDEPENDENT PROJECTS | 2026"]
    for project_id in role["cases"]:
        project = PROJECTS[project_id]
        text_lines.extend(["", project["name"], project["stack"], DATA["portfolio"] + "#/case/" + project_id])
        text_lines.extend("- " + bullet for bullet in (zh_bullets[project_id] if chinese else project["resume"]))
        text_lines.append("Source: " + project["source"])
        if project.get("article"):
            text_lines.append("Writing sample: " + project["article"])
    text_lines.extend(["", "合作方式" if chinese else "WORKING ARRANGEMENT", working, "", "September 2026"])
    output.with_suffix(".txt").write_text("\n".join(text_lines) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "public/downloads")
    parser.add_argument("--chinese-font", type=Path, default=Path("C:/Windows/Fonts/simhei.ttf"))
    args = parser.parse_args()
    if not args.chinese_font.is_file():
        parser.error("Provide an installed, embeddable Chinese TrueType font with --chinese-font.")
    pdfmetrics.registerFont(TTFont("KaiChinese", str(args.chinese_font)))
    for profile_role in DATA["roles"]:
        build(profile_role, args.out / (profile_role["file"] + ".pdf"))
    build(DATA["roles"][0], args.out / "kai-frontend-developer-zh.pdf", chinese=True)
