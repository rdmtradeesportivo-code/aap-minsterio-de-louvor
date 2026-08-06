from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_role
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteComVeiculos, ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.veiculo import VeiculoOut

# Recepção cadastra/edita clientes; Admin e Financeiro veem tudo.
# Mecânico não precisa deste módulo (só enxerga as OS atribuídas a ele).
router = APIRouter(
    prefix="/api/clientes",
    tags=["clientes"],
    dependencies=[Depends(require_role("admin", "financeiro", "recepcao"))],
)


@router.get("", response_model=list[ClienteOut])
def listar_clientes(busca: str | None = None, db: Session = Depends(get_db)) -> list[Cliente]:
    query = db.query(Cliente)
    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Cliente.nome.ilike(termo))
            | (Cliente.cpf_cnpj.ilike(termo))
            | (Cliente.telefone.ilike(termo))
        )
    return query.order_by(Cliente.nome).all()


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def criar_cliente(payload: ClienteCreate, db: Session = Depends(get_db)) -> Cliente:
    if payload.cpf_cnpj:
        if db.query(Cliente).filter(Cliente.cpf_cnpj == payload.cpf_cnpj).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="CPF/CNPJ já cadastrado"
            )

    cliente = Cliente(**payload.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.get("/{cliente_id}", response_model=ClienteComVeiculos)
def obter_cliente(cliente_id: int, db: Session = Depends(get_db)) -> Cliente:
    cliente = (
        db.query(Cliente)
        .options(selectinload(Cliente.veiculos))
        .filter(Cliente.id == cliente_id)
        .first()
    )
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(
    cliente_id: int, payload: ClienteUpdate, db: Session = Depends(get_db)
) -> Cliente:
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

    dados = payload.model_dump(exclude_unset=True)
    if "cpf_cnpj" in dados and dados["cpf_cnpj"] and dados["cpf_cnpj"] != cliente.cpf_cnpj:
        if db.query(Cliente).filter(Cliente.cpf_cnpj == dados["cpf_cnpj"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="CPF/CNPJ já cadastrado"
            )

    for campo, valor in dados.items():
        setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_cliente(cliente_id: int, db: Session = Depends(get_db)) -> None:
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()


@router.get("/{cliente_id}/veiculos", response_model=list[VeiculoOut])
def listar_veiculos_do_cliente(cliente_id: int, db: Session = Depends(get_db)) -> list:
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return cliente.veiculos
