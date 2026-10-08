import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class RegisterApiTest {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        String json = "{\"username\":\"newuser\",\"password\":\"newpass\"}";
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI("http://localhost:3000/api/auth/register"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
                
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        assert response.statusCode() == 200;
        
        HttpRequest verifyRequest = HttpRequest.newBuilder()
                .uri(new URI("http://localhost:3000/api/users/newuser"))
                .GET()
                .build();
                
        HttpResponse<String> verifyResponse = client.send(verifyRequest, HttpResponse.BodyHandlers.ofString());
        assert verifyResponse.statusCode() == 200;
    }
}
