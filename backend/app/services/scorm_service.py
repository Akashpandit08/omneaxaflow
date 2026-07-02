import html
import json
import os
import shutil
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


class SCORMService:
    def generate_manifest(self, title: str, version: str = "SCORM 1.2") -> str:
        manifest = ET.Element(
            "manifest",
            {
                "identifier": "com.omneaxaflow.scorm",
                "version": "1.0",
                "xmlns": "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
                "xmlns:adlcp": "http://www.adlnet.org/xsd/adlcp_rootv1p2",
            },
        )

        metadata = ET.SubElement(manifest, "metadata")
        ET.SubElement(metadata, "schema").text = "ADL SCORM"
        ET.SubElement(metadata, "schemaversion").text = "1.2" if version == "SCORM 1.2" else "2004 3rd Edition"

        organizations = ET.SubElement(manifest, "organizations", default="default_org")
        org = ET.SubElement(organizations, "organization", identifier="default_org")
        ET.SubElement(org, "title").text = title
        item = ET.SubElement(org, "item", identifier="item_1", identifierref="resource_1")
        ET.SubElement(item, "title").text = title

        resources = ET.SubElement(manifest, "resources")
        resource = ET.SubElement(
            resources,
            "resource",
            identifier="resource_1",
            type="webcontent",
            href="index.html",
        )
        resource.set("{http://www.adlnet.org/xsd/adlcp_rootv1p2}scormType", "sco")
        for href in ["index.html", "player.js", "scorm-api.js", "quiz-data.json"]:
            ET.SubElement(resource, "file", href=href)

        xml_str = ET.tostring(manifest, encoding="unicode", method="xml")
        return f"<?xml version='1.0' encoding='UTF-8'?>\n{xml_str}"

    def generate_launch_page(self, video_url: str, title: str) -> str:
        escaped_title = html.escape(title)
        escaped_video_url = html.escape(video_url, quote=True)
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escaped_title}</title>
  <script src="scorm-api.js"></script>
  <script defer src="player.js"></script>
</head>
<body>
  <main>
    <h1>{escaped_title}</h1>
    <video id="omneaxa-video" controls preload="metadata" src="{escaped_video_url}" style="width:100%;max-width:960px"></video>
    <section id="quiz-container" aria-live="polite"></section>
  </main>
</body>
</html>
"""

    def generate_player_js(self, version: str) -> str:
        if version == "SCORM 1.2":
            return """
const api = window.API || null;
function scormInitialize(){ if(api){ api.LMSInitialize(""); } }
function scormSet(key, value){ if(api){ api.LMSSetValue(key, String(value)); } }
function scormCommit(){ if(api){ api.LMSCommit(""); } }
function scormFinish(){ if(api){ api.LMSFinish(""); } }
function markComplete(score){
  scormSet("cmi.core.lesson_status", score >= 70 ? "passed" : "completed");
  scormSet("cmi.core.score.raw", score);
  scormCommit();
}
"""
        return """
const api = window.API_1484_11 || null;
function scormInitialize(){ if(api){ api.Initialize(""); } }
function scormSet(key, value){ if(api){ api.SetValue(key, String(value)); } }
function scormCommit(){ if(api){ api.Commit(""); } }
function scormFinish(){ if(api){ api.Terminate(""); } }
function markComplete(score){
  scormSet("cmi.completion_status", "completed");
  scormSet("cmi.success_status", score >= 70 ? "passed" : "failed");
  scormSet("cmi.score.raw", score);
  scormCommit();
}
"""

    def generate_scorm_api_wrapper(self) -> str:
        return """
window.addEventListener("load", () => {
  scormInitialize();
  const video = document.getElementById("omneaxa-video");
  video.addEventListener("ended", () => markComplete(100));
});
window.addEventListener("beforeunload", () => scormFinish());
"""

    def build_package(self, video_id: int, video_url: str, title: str, quizzes: list, version: str) -> str:
        if not video_url:
            raise ValueError("SCORM export requires a completed video URL.")
        if version not in {"SCORM 1.2", "SCORM 2004"}:
            raise ValueError("Unsupported SCORM version.")

        temp_dir = Path(tempfile.mkdtemp(prefix=f"scorm_{video_id}_"))
        zip_path = Path(tempfile.gettempdir()) / f"scorm_pkg_vid_{video_id}_{os.getpid()}.zip"

        try:
            (temp_dir / "imsmanifest.xml").write_text(self.generate_manifest(title, version), encoding="utf-8")
            (temp_dir / "index.html").write_text(self.generate_launch_page(video_url, title), encoding="utf-8")
            (temp_dir / "player.js").write_text(self.generate_player_js(version), encoding="utf-8")
            (temp_dir / "scorm-api.js").write_text(self.generate_scorm_api_wrapper(), encoding="utf-8")
            (temp_dir / "quiz-data.json").write_text(json.dumps({"quizzes": quizzes}, default=str), encoding="utf-8")

            required = {"imsmanifest.xml", "index.html", "player.js", "scorm-api.js", "quiz-data.json"}
            missing = [name for name in required if not (temp_dir / name).exists()]
            if missing:
                raise RuntimeError(f"SCORM package missing required files: {', '.join(missing)}")

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for file_path in temp_dir.iterdir():
                    zipf.write(file_path, file_path.name)
            return str(zip_path)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
