"""
Active Directory (LDAP) Authentication Module
Provides AD authentication with fallback to local authentication
"""
import logging
import os
from typing import Optional, Dict, Any
from ldap3 import Server, Connection, ALL, NTLM, SIMPLE
from ldap3.core.exceptions import LDAPException, LDAPBindError

logger = logging.getLogger(__name__)

class ADAuthenticator:
    """Active Directory authentication handler"""
    
    def __init__(self):
        self.enabled = os.getenv('AD_ENABLED', 'false').lower() == 'true'
        self.server_url = os.getenv('AD_SERVER', 'ldap://192.168.10.20')
        self.port = int(os.getenv('AD_PORT', '389'))
        self.domain = os.getenv('AD_DOMAIN', 'ANE.LOCAL')
        self.base_dn = os.getenv('AD_BASE_DN', 'DC=ANE,DC=LOCAL')
        self.bind_user = os.getenv('AD_BIND_USER', '')
        self.bind_password = os.getenv('AD_BIND_PASSWORD', '')
        self.use_ssl = os.getenv('AD_USE_SSL', 'false').lower() == 'true'
        
        logger.info(f"AD Authentication: {'Enabled' if self.enabled else 'Disabled'}")
        if self.enabled:
            logger.info(f"AD Server: {self.server_url}:{self.port} | Domain: {self.domain}")
    
    def authenticate(self, username: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user against Active Directory
        
        Args:
            username: Username (without domain)
            password: User password
            
        Returns:
            Dictionary with authentication result:
            {
                'success': bool,
                'user_info': dict,  # if success
                'error': str  # if failed
            }
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'AD authentication is disabled'
            }
        
        if not username or not password:
            return {
                'success': False,
                'error': 'Username and password are required'
            }
        
        try:
            # Create LDAP server object
            server = Server(
                self.server_url,
                port=self.port,
                get_info=ALL,
                use_ssl=self.use_ssl
            )
            
            # Try different authentication formats
            user_formats = [
                f"{self.domain}\\{username}",  # DOMAIN\username
                f"{username}@{self.domain}",    # username@DOMAIN
                f"CN={username},{self.base_dn}"  # CN=username,DC=...
            ]
            
            connection = None
            last_error = None
            
            for user_dn in user_formats:
                try:
                    logger.debug(f"Attempting AD bind with: {user_dn}")
                    
                    connection = Connection(
                        server,
                        user=user_dn,
                        password=password,
                        authentication=NTLM if '\\' in user_dn else SIMPLE,
                        auto_bind=True
                    )
                    
                    if connection.bound:
                        logger.info(f"AD authentication successful for user: {username}")
                        
                        # Retrieve user information
                        user_info = self._get_user_info(connection, username)
                        
                        connection.unbind()
                        
                        return {
                            'success': True,
                            'user_info': user_info
                        }
                        
                except LDAPBindError as e:
                    last_error = str(e)
                    logger.debug(f"Bind failed for {user_dn}: {last_error}")
                    continue
                except Exception as e:
                    last_error = str(e)
                    logger.debug(f"Connection failed for {user_dn}: {last_error}")
                    continue
            
            # All formats failed
            logger.warning(f"AD authentication failed for user: {username}")
            return {
                'success': False,
                'error': f'Invalid credentials or user not found. Last error: {last_error}'
            }
            
        except LDAPException as e:
            error_msg = f"LDAP error: {str(e)}"
            logger.error(f"AD authentication error for {username}: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"AD authentication exception for {username}: {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def _get_user_info(self, connection: Connection, username: str) -> Dict[str, Any]:
        """
        Retrieve user information from Active Directory
        
        Args:
            connection: Active LDAP connection
            username: Username to query
            
        Returns:
            Dictionary with user information
        """
        try:
            # Search for user
            search_filter = f"(sAMAccountName={username})"
            connection.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                attributes=['cn', 'mail', 'displayName', 'memberOf', 'department']
            )
            
            if connection.entries:
                entry = connection.entries[0]
                
                # Extract group memberships
                groups = []
                if hasattr(entry, 'memberOf'):
                    for group_dn in entry.memberOf:
                        # Extract CN from DN (e.g., CN=Admins,OU=... -> Admins)
                        if 'CN=' in str(group_dn):
                            cn = str(group_dn).split('CN=')[1].split(',')[0]
                            groups.append(cn)
                
                return {
                    'username': username,
                    'email': str(entry.mail) if hasattr(entry, 'mail') else None,
                    'display_name': str(entry.displayName) if hasattr(entry, 'displayName') else username,
                    'department': str(entry.department) if hasattr(entry, 'department') else None,
                    'groups': groups,
                    'auth_provider': 'ad'
                }
            else:
                logger.warning(f"User {username} not found in AD search")
                return {
                    'username': username,
                    'email': None,
                    'display_name': username,
                    'groups': [],
                    'auth_provider': 'ad'
                }
                
        except Exception as e:
            logger.error(f"Error retrieving user info for {username}: {str(e)}")
            return {
                'username': username,
                'email': None,
                'display_name': username,
                'groups': [],
                'auth_provider': 'ad'
            }
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test AD connection without authentication
        
        Returns:
            Dictionary with connection status
        """
        if not self.enabled:
            return {
                'success': False,
                'message': 'AD authentication is disabled',
                'server': None
            }
        
        try:
            server = Server(
                self.server_url,
                port=self.port,
                get_info=ALL,
                use_ssl=self.use_ssl
            )
            
            # Test with bind user if configured
            if self.bind_user and self.bind_password:
                connection = Connection(
                    server,
                    user=f"{self.domain}\\{self.bind_user}",
                    password=self.bind_password,
                    authentication=NTLM,
                    auto_bind=True
                )
                
                if connection.bound:
                    connection.unbind()
                    return {
                        'success': True,
                        'message': 'AD server connection successful',
                        'server': self.server_url,
                        'domain': self.domain
                    }
            else:
                # Just test server reachability
                return {
                    'success': True,
                    'message': 'AD server reachable (bind test not performed)',
                    'server': self.server_url,
                    'domain': self.domain
                }
                
        except Exception as e:
            logger.error(f"AD connection test failed: {str(e)}")
            return {
                'success': False,
                'message': f'Connection failed: {str(e)}',
                'server': self.server_url
            }
    
    def get_config(self) -> Dict[str, Any]:
        """
        Get current AD configuration (sanitized)
        
        Returns:
            Dictionary with configuration details
        """
        return {
            'enabled': self.enabled,
            'server': self.server_url,
            'port': self.port,
            'domain': self.domain,
            'base_dn': self.base_dn,
            'use_ssl': self.use_ssl,
            'bind_user_configured': bool(self.bind_user)
        }


# Global AD authenticator instance
ad_authenticator = ADAuthenticator()
