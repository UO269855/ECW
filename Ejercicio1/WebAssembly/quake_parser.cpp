#include <string>
#include <iostream>
#include <tinyxml2.h>
#include "nlohmann/json.hpp"

using namespace tinyxml2;
using json = nlohmann::json;

extern "C" {
    const char* parse_quakeml(const char* quakeml_data) {
        // Create an XML document and parse the QuakeML data
        XMLDocument doc;
        doc.Parse(quakeml_data);
        
        if (doc.Error()) {
            return "{}";  // Return empty JSON if parsing fails
        }
        
        // Create a JSON array to hold the list of earthquakes
        json json_array = json::array();
        
        // Find the eventParameters element
        XMLElement* eventParameters = doc.FirstChildElement("q:quakeml")->FirstChildElement("eventParameters");
        
        if (eventParameters) {
            // Iterate through all the event elements
            for (XMLElement* event = eventParameters->FirstChildElement("event"); event != nullptr; event = event->NextSiblingElement("event")) {
                json earthquake;
                
                // Get the time element
                XMLElement* time = event->FirstChildElement("origin")->FirstChildElement("time");
                if (time) {
                    const char* timestamp = time->FirstChildElement("value")->GetText();
                    earthquake["time"] = timestamp ? timestamp : "";
                }
                
                // Get the longitude element
                XMLElement* longitude = event->FirstChildElement("origin")->FirstChildElement("longitude");
                if (longitude) {
                    const char* longValue = longitude->FirstChildElement("value")->GetText();
                    earthquake["lng"] = longValue ? longValue : "";
                }
                
                // Get the latitude element
                XMLElement* latitude = event->FirstChildElement("origin")->FirstChildElement("latitude");
                if (latitude) {
                    const char* latValue = latitude->FirstChildElement("value")->GetText();
                    earthquake["lat"] = latValue ? latValue : "";
                }

                // Get the depth element
                XMLElement* depth = event->FirstChildElement("origin")->FirstChildElement("depth");
                if (depth) {
                    const char* depthValue = depth->FirstChildElement("value")->GetText();
                    earthquake["depth"] = depthValue ? depthValue : "";
                }

                // Get the magnitude element
                XMLElement* magnitude = event->FirstChildElement("magnitude")->FirstChildElement("mag");
                if (magnitude) {
                    const char* magnitudeValue = magnitude->FirstChildElement("value")->GetText();
                    earthquake["magnitude"] = magnitudeValue ? magnitudeValue : "";
                }

                // Get the magnitude element
                XMLElement* description = event->FirstChildElement("description");
                if (description) {
                    const char* descriptionValue = description->FirstChildElement("text")->GetText();
                    earthquake["place"] = descriptionValue ? descriptionValue : "";
                }
                
                // Add the individual earthquake data to the JSON array
                json_array.push_back(earthquake);
            }
        } else {
            std::cout << "No eventParameters element found!" << std::endl;
        }
        
        // Return the JSON array as a string
        std::string json_string = json_array.dump();
        char* cstr = new char[json_string.length() + 1];
        strcpy(cstr, json_string.c_str());
        return cstr;
    }
}
