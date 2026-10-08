import os
import re

test_dir = r"src\test\java\com\example\tests"

for filename in os.listdir(test_dir):
    if not filename.endswith(".java") or filename == "BaseTest.java":
        continue
        
    filepath = os.path.join(test_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    original_content = content
    
    # Check if it already extends BaseTest
    if "extends BaseTest" not in content:
        # Replace class definition
        class_pattern = r"(public class \w+)\s*{"
        content = re.sub(class_pattern, r"\1 extends BaseTest {", content)
        
    # Remove local driver declaration
    content = re.sub(r"private ChromeDriver driver;\s*", "", content)
    
    # Remove @Before setUp block
    setup_pattern = r"@Before\s+public void setUp\(\)\s*{[^}]*?driver\.get\([^}]*?}\s*"
    content = re.sub(setup_pattern, "", content, flags=re.DOTALL)
    
    # Remove @After tearDown block
    teardown_pattern = r"@After\s+public void tearDown\(\)\s*{[^}]*?driver\.quit\([^}]*?}\s*"
    content = re.sub(teardown_pattern, "", content, flags=re.DOTALL)
    
    # Convert public static void main to @Test
    if "public static void main" in content:
        content = content.replace("public static void main(String[] args) throws Exception", "@Test\n    public void testMain() throws Exception")
        content = content.replace("public static void main(String[] args)", "@Test\n    public void testMain() throws Exception")
        if "import org.junit.Test;" not in content:
            content = content.replace("public class", "import org.junit.Test;\n\npublic class")
            
    # Clean up imports
    content = re.sub(r"import org\.openqa\.selenium\.chrome\.ChromeDriver;\s*", "", content)
    content = re.sub(r"import org\.junit\.Before;\s*", "", content)
    content = re.sub(r"import org\.junit\.After;\s*", "", content)
    
    # EcholytixApiTest has a slightly different setup/teardown due to missing driver!=null check, we can just use a more aggressive regex if needed,
    # but let's check if the generic one got it.
    setup_pattern_2 = r"@Before\s+public void setUp\(\)\s*{.*?}"
    content = re.sub(setup_pattern_2, "", content, flags=re.DOTALL)
    
    teardown_pattern_2 = r"@After\s+public void tearDown\(\)\s*{.*?}"
    content = re.sub(teardown_pattern_2, "", content, flags=re.DOTALL)

    if content != original_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Refactored: {filename}")
