from typing import TypeVar, Generic, Union, Dict

T = TypeVar('T')
E = TypeVar('E')

class Response(Generic[T, E]):
    @staticmethod
    def ok(value: T) -> 'Response[T, E]':
        return Response(value, None)
        
    @staticmethod
    def err(error: E) -> 'Response[T, E]':
        return Response(None, error)

class FixedString:
    def __init__(self, length: int):
        self.length = length

class Principal:
    """Represents a Stacks principal (account address)"""
    pass

def public(func):
    """Decorator for public contract functions"""
    return func

def readonly(func):
    """Decorator for read-only contract functions"""
    return func

def private(func):
    """Decorator for private contract functions"""
    return func

def map_type(cls):
    """Decorator for contract maps"""
    return cls