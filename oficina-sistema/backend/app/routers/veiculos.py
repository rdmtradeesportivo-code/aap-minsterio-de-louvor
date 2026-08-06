from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.cliente import Cliente
from app.models.veiculo import Veiculo
from app.schemas.veiculo import VeiculoCreate, VeiculoOut, VeiculoUpdate

router = APIRouter(
    prefix="/api/veiculos",
    tags=["veículos"],
    dependencies=[Depends(require_role("admin", "financeiro", "recepcao"))],
)


@router.get("", response_model=list[VeiculoOut])
def listar_veiculos(placa: str | None = None, db: Session = Depends(get_db)) -> list[Veiculo]:
    query = db.query(Veiculo)
    if placa:
        query = query.filter(Veiculo.placa.ilike(f"%{placa}%"))
    return query.order_by(Veiculo.placa).all()


@router.post("", response_model=VeiculoOut, status_code=status.HTTP_201_CREATED)
def criar_veiculo(payload: VeiculoCreate, db: Session = Depends(get_db)) -> Veiculo:
    if db.get(Cliente, payload.cliente_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

    if db.query(Veiculo).filter(Veiculo.placa == payload.placa).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Placa já cadastrada")

    veiculo = Veiculo(**payload.model_dump())
    db.add(veiculo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Placa já cadastrada")
    db.refresh(veiculo)
    return veiculo


@router.get("/{veiculo_id}", response_model=VeiculoOut)
def obter_veiculo(veiculo_id: int, db: Session = Depends(get_db)) -> Veiculo:
    veiculo = db.get(Veiculo, veiculo_id)
    if veiculo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    return veiculo


@router.put("/{veiculo_id}", response_model=VeiculoOut)
def atualizar_veiculo(
    veiculo_id: int, payload: VeiculoUpdate, db: Session = Depends(get_db)
) -> Veiculo:
    veiculo = db.get(Veiculo, veiculo_id)
    if veiculo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")

    dados = payload.model_dump(exclude_unset=True)

    if "cliente_id" in dados and db.get(Cliente, dados["cliente_id"]) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

    if "placa" in dados and dados["placa"] != veiculo.placa:
        if db.query(Veiculo).filter(Veiculo.placa == dados["placa"]).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Placa já cadastrada")

    for campo, valor in dados.items():
        setattr(veiculo, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Placa já cadastrada")
    db.refresh(veiculo)
    return veiculo


@router.delete("/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_veiculo(veiculo_id: int, db: Session = Depends(get_db)) -> None:
    veiculo = db.get(Veiculo, veiculo_id)
    if veiculo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    db.delete(veiculo)
    db.commit()


# Histórico de serviços por veículo (todas as OS já feitas naquele carro) será
# adicionado quando o módulo de Ordens de Serviço existir (Módulo 4).
