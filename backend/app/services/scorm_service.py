import os
import tempfile
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

class SCORMService:
    def __init__(self):
        pass
        
    def generate_manifest(self, title: str, version: str = "SCORM 1.2") -> str:
        """Generates a scorm manifest (imsmanifest.xml)"""
        # A basic SCORM 1.2 manifest structure
        manifest = ET.Element("manifest", identifier="com.aivideo.scorm", version="1.0")
        
        metadata = ET.SubElement(manifest, "metadata")
        schema = ET.SubElement(metadata, "schema")
        schema.text = "ADL SCORM"
        schemaversion = ET.SubElement(metadata, "schemaversion")
        schemaversion.text = "1.2" if version == "SCORM 1.2" else "2004 3rd Edition"
        
        organizations = ET.SubElement(manifest, "organizations", default="default_org")
        org = ET.SubElement(organizations, "organization", identifier="default_org")
        item_title = ET.SubElement(org, "title")
        item_title.text = title
        
        item = ET.SubElement(org, "item", identifier="item_1", identifierref="resource_1")
        item_title2 = ET.SubElement(item, "title")
        item_title2.text = title

        resources = ET.SubElement(manifest, "resources")
        resource = ET.SubElement(resources, "resource", identifier="resource_1", type="webcontent", adlcp_scormType="sco" if version == "SCORM 1.2" else "sco", href="index.html")
        ET.SubElement(resource, "file", href="index.html")
        
        # Add XML declaration and return
        xml_str = ET.tostring(manifest, encoding='unicode', method='xml')
        return f"<?xml version='1.0' encoding='UTF-8'?>\n{xml_str}"

    def generate_launch_page(self, video_url: str, title: str, quizzes: list) -> str:
        """Generates a simple index.html launch page that loads the video and SCORM JS."""
        
        # Just a mocked minimal representation for SCORM player
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <script src="scorm-api.js"></script>
</head>
<body>
    <h1>{title}</h1>
    <video controls src="{video_url}"></video>
    <script>
        // Init SCORM
        console.log("SCORM Initialized");
    </script>
</body>
</html>
"""
        return html
        
    def build_package(self, video_id: int, video_url: str, title: str, quizzes: list, version: str) -> str:
        """Builds a zip file package and returns the local path."""
        import zipfile
        
        # Create a temp dir
        temp_dir = tempfile.mkdtemp()
        
        manifest_content = self.generate_manifest(title, version)
        with open(os.path.join(temp_dir, "imsmanifest.xml"), "w") as f:
            f.write(manifest_content)
            
        launch_content = self.generate_launch_page(video_url, title, quizzes)
        with open(os.path.join(temp_dir, "index.html"), "w") as f:
            f.write(launch_content)
            
        # Mock JS API file
        with open(os.path.join(temp_dir, "scorm-api.js"), "w") as f:
            f.write("/* Mock SCORM API Wrapper */")
            
        # Create zip
        zip_path = os.path.join(tempfile.gettempdir(), f"scorm_pkg_vid_{video_id}.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
                    
        return zip_path
