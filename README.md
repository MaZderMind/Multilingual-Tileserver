# Multilingual Tileserver
primarily written for Wikimedia but also useful for other scenarios. It will involve
 - a tile-server written in nodejs, containing the queing and rendering logic
 - a reddis-cache to hold the language distribution, tile age and such
 - a (possibly slightly modified) version of the osm.org-style

Goals of the Setup are
 - One or more multilingual map-styles
 - One or more monolithic map-styles
 - Only tiles that have translations are rendered in a specific language
 - Custom Fallback-Chains (if a name is not present in 'de' try 'ch' then try'at' and then fall back to the default name) for each language

