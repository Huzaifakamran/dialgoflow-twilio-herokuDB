# Note:
By default heroku db allow readonly access, inorder to write transactional queries you need to write your query under the below syntax:
begin;
set transaction read write;
<YOUR_QUERY_HERE>;
COMMIT; 